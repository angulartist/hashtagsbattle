from __future__ import absolute_import

import json
# Beam
import logging

import apache_beam as beam
import six
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.options.pipeline_options import SetupOptions
from apache_beam.options.pipeline_options import StandardOptions, GoogleCloudOptions
from apache_beam.transforms import trigger
from hashtagsbattle.conf.gcp import *
from hashtagsbattle.helpers import *
from hashtagsbattle.transformers import *
from hashtagsbattle.conf.vars import *
from hashtagsbattle.combiners.top import TopDistinctFn


def run(argv=None):
    class MyOptions(PipelineOptions):

        @classmethod
        def _add_argparse_args(cls, parser):
            parser.add_argument(
                    '--input', default=TW_INPUT)
            parser.add_argument(
                    '--output', default=TW_OUTPUT)

    options = PipelineOptions(flags=argv)

    options.view_as(SetupOptions).save_main_session = True
    options.view_as(StandardOptions).streaming = True

    google_cloud_options = options.view_as(GoogleCloudOptions)
    google_cloud_options.project = PROJECT_ID
    google_cloud_options.staging_location = STAGING_LOCATION
    google_cloud_options.temp_location = TEMP_LOCATION
    # google_cloud_options.job_name = 'hashtags-battle-final'

    """
    -> Uncomment this to run the pipeline on the Cloud Dataflow runner.
    $ python beam_dataflow/main.py --setup_file beam_dataflow/setup.py
    """
    # options.view_as(StandardOptions).runner = 'DataflowRunner'

    with beam.Pipeline(options=options) as p:
        my_options = options.view_as(MyOptions)
        input_topic = my_options.input
        output_topic = my_options.output

        """
        -> Consumes/collects events sent by the input Pub/Sub topic.
        @: id_label argument is a unique identifier used by the pipeline to
        deduplicate events : Exactly-once semantic.
        """
        inputs = \
            (p
             | 'Read From Pub/Sub' >> beam.io.ReadFromPubSub(
                            topic=input_topic,
                            # id_label='event_id'
                    ).with_output_types(six.binary_type)
             | 'Decode Binary' >> beam.Map(lambda element: element.decode('utf-8'))
             | 'Transform Json To Dict' >> beam.Map(lambda element: json.loads(element)))
        # | 'Add Event Time' >> beam.ParDo(AddTimestampFn())

        """
        -> Tweets.
        TODO: Clean unused fields.
        """
        (inputs
         | 'Batch Tweets' >> beam.BatchElements(min_batch_size=49, max_batch_size=50)
         | 'Publish Tweets' >> WriteToPubSub(topic=output_topic,
                                             category=Category.TWEETS))

        """
        -> Extracts hashtags array from object.
        """
        hashtags = \
            (inputs
             | 'Get Hashtags' >> beam.Map(lambda element: element['hashtags'])
             | 'Explode Hashtags' >> beam.FlatMap(lambda element: element))

        """
        -> Outputs a batch of pre-aggregated hashtags.
        Triggering early results from the window every X seconds (processing time trigger)
        or triggering when the current pane has collected at least N elements (data-driven trigger)
        Values used are for testing purposes.
        """
        (hashtags
         | 'Apply Daily Window' >> beam.WindowInto(
                        beam.window.FixedWindows(SECONDS_IN_1_DAY),
                        trigger=trigger.Repeatedly(trigger.AfterCount(10)),
                        accumulation_mode=trigger.AccumulationMode.ACCUMULATING)
         | 'Grouping Hashtags' >> PairWithOneCombine()
         | 'Format Hashtags' >> beam.ParDo(FormatHashtagFn())
         | 'Batch Hashtags' >> beam.BatchElements(min_batch_size=49, max_batch_size=50)
         | 'Publish Hashtags' >> WriteToPubSub(topic=output_topic,
                                               category=Category.DAILY_HASHTAGS))

        """
        -> Outputs the sum of processed events for a given fixed-time window.
        TODO: This does not work on the Cloud Dataflow Runner : SO #56665403
        """
        (hashtags
         | 'Apply 5 Minutes' >> beam.WindowInto(
                        beam.window.FixedWindows(size=5 * 60),
                        trigger=trigger.Repeatedly(
                                trigger.AfterCount(20)),
                        accumulation_mode=trigger.AccumulationMode.DISCARDING)
         | 'CG+CC' >> beam.CombineGlobally(
                        beam.combiners.CountCombineFn()).without_defaults()
         | 'Publish Events Sum' >> WriteToPubSub(topic=output_topic,
                                                 category=Category.GLOBAL_EVENTS))

        """
        -> Outputs the top 5 trending hashtags within a given fixed-time window.
        TODO: This does not work on the Cloud Dataflow Runner : SO #56665403
        """
        (hashtags
         | 'Apply %s Min FW' % '30' >> beam.WindowInto(
                        beam.window.FixedWindows(size=SECONDS_IN_HALF_HOUR),
                        trigger=trigger.Repeatedly(
                                trigger.AfterCount(2)),
                        accumulation_mode=trigger.AccumulationMode.ACCUMULATING)
         | 'Grouping Trends' >> PairWithOneCombine()
         | '%s Trending Hashtags' % TRENDING_HASHTAGS_LIMIT >> beam.CombineGlobally(
                        TopDistinctFn(n=TRENDING_HASHTAGS_LIMIT,
                                      compare=lambda a, b: a[1] < b[1])).without_defaults()
         | 'Format Trending Hashtags' >> beam.ParDo(FormatHashtagsFn())
         | 'Publish Trending Hashtags' >> WriteToPubSub(topic=output_topic,
                                                        category=Category.TRENDING_HASHTAGS))


"""
-> Main entry point.
"""
if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    run()

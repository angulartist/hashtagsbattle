import json
import logging
from datetime import datetime

import apache_beam as beam
import six


def format_timestamp(timestamp, fmt='%Y-%m-%d %H:%M:%S'):
    """Converts a unix timestamp into a formatted string """
    return datetime.fromtimestamp(timestamp).strftime(fmt)


class Category(object):
    GLOBAL_EVENTS = 'GLOBAL_EVENTS'
    DAILY_HASHTAGS = 'DAILY_HASHTAGS'
    TRENDING_HASHTAGS = 'TRENDING_HASHTAGS'


class PrintFn(beam.DoFn):
    ''' A DoFn that prints the current element, its window, and its timestamp. '''

    def to_runner_api_parameter(self, unused_context):
        pass

    def __init__(self):
        super(PrintFn, self).__init__()

    def process(self, element, timestamp=beam.DoFn.TimestampParam,
                window=beam.DoFn.WindowParam):
        logging.info('element=%s | window=%s | timestamp=%s', element, window, timestamp)

        yield element


class FormatOutput(beam.DoFn):
    def to_runner_api_parameter(self, unused_context):
        pass

    def __init__(self, category):
        super(FormatOutput, self).__init__()
        self.category = category

    def process(self, element=beam.DoFn.ElementParam,
                timestamp_param=beam.DoFn.TimestampParam,
                window_param=beam.DoFn.WindowParam):
        # Window metadata
        window_start, window_end, timestamp = [
                format_timestamp(window_param.start),
                format_timestamp(window_param.end),
                float(timestamp_param)
        ]

        obj = {
                'category': self.category,
                'output'  :
                    {
                            'timestamp': timestamp,
                            'window'   : {
                                    'start': window_start,
                                    'end'  : window_end
                            }
                    }
        }

        def handle_global_events():
            obj['output']['snapshot'] = element

            return obj

        def handle_daily_hashtags():
            obj['output']['events'] = sum(key["score"] for key in element)
            obj['output']['collection'] = element

            return obj

        def handle_trending_hashtags():
            obj['output']['collection'] = element

            return obj

        options = {
                Category.GLOBAL_EVENTS    : handle_global_events,
                Category.DAILY_HASHTAGS   : handle_daily_hashtags,
                Category.TRENDING_HASHTAGS: handle_trending_hashtags,
        }

        yield options[self.category]()


class WriteToPubSub(beam.PTransform):
    def __init__(self, topic, category):
        super(WriteToPubSub, self).__init__()
        self.topic = topic
        self.category = category

    def expand(self, p):
        output = (p
                  | 'Format Output' >> beam.ParDo(
                        FormatOutput(category=self.category))
                  | 'Make base64 string' >> beam.Map(
                        lambda element: json.dumps(element))
                  | 'DEBUG:' >> beam.ParDo(PrintFn()))

        return output | 'Publish To Pub/Sub' >> beam.io.WriteToPubSub(
                topic=self.topic).with_output_types(six.binary_type)

import apache_beam as beam


class AddTimestampFn(beam.DoFn):
    """
    Use event-time instead of processing-time
    Event-time is when the event has been produced on the device/by the service
    """

    def to_runner_api_parameter(self, unused_context):
        pass

    def __init__(self):
        super(AddTimestampFn, self).__init__()

    def process(self, element, **kwargs):
        yield beam.window.TimestampedValue(element, int(element['event_time']))


class FilterNoVenueEventsFn(beam.DoFn):
    def to_runner_api_parameter(self, unused_context):
        pass

    def process(self, element, *args, **kwargs):
        if 'venue' in element:
            yield element
        else:
            return


class FormatHashtagFn(beam.DoFn):
    def to_runner_api_parameter(self, unused_context):
        pass

    def process(self, element=beam.DoFn.ElementParam):
        key, score = element
        identifier, tag = key.split('$')

        yield {
                'key'  : identifier,
                'tag'  : tag,
                'score': score
        }


class FormatHashtagsFn(beam.DoFn):
    def to_runner_api_parameter(self, unused_context):
        pass

    def process(self, element=beam.DoFn.ElementParam):
        hashtags = []

        for pair in element:
            key, score = pair
            identifier, tag = key.split('$')
            hashtags.append({
                    'key'  : identifier,
                    'tag'  : tag,
                    'score': score
            })

        yield hashtags


class PairWithOneCombine(beam.PTransform):
    def __init__(self):
        super(PairWithOneCombine, self).__init__()

    def expand(self, p):
        return (p
                | 'PairWithOne Hashtags' >> beam.Map(
                        lambda element: ('%s$%s' % (element['key'], element['tag']), 1))
                | 'Group/Sum Hashtags By Key' >> beam.CombinePerKey(sum))

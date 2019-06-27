import json


class JsonCoder(object):
    """A JSON coder interpreting each line as a JSON string."""

    def encode(self, x):
        return json.dumps(x)

    def decode(self, x):
        return json.loads(x)

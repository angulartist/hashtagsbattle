# coding: utf-8
import time
from pprint import pprint
from unicodedata import normalize

import simplejson as json
import tweepy
from google.cloud import pubsub_v1
from tweepy.streaming import StreamListener

from conf.accounts import accounts
from conf.gcloud import project_id, pub_sub_input
from conf.params import WORLD_BOUNDS

# Init Twitter's API access settings
listener_1 = accounts["user_1"]
auth = tweepy.OAuthHandler(listener_1["consumer_key"], listener_1["consumer_secret"])
auth.set_access_token(listener_1["access_token"], listener_1["access_token_secret"])
api = tweepy.API(auth, wait_on_rate_limit=True, wait_on_rate_limit_notify=False)

# Init Pub/Sub publisher settings
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, pub_sub_input)


def write_to_pubsub(element):
    """
    Publish an event to the Pub/Sub input topic
    :param element: The tweet dictionary
    :return: <void>
    """
    try:
        # Make it a base64str
        payload = json.dumps(element).encode("utf-8")
        # Publish the message with some attributes:
        # TODO: add the event-time
        publisher.publish(topic=topic_path,
                          data=payload,
                          event_id=element["id"])
    except Exception as exception:
        raise exception


def does_contain_hashtags(element):
    """
    Check if the tweet contains any hashtags
    :param element: The tweet dictionary
    :return: Boolean
    """
    return True if element["entities"]["hashtags"] else False


def normalized(element):
    """
    Just do some garbage cleaning
    :param element: The tweet dictionary
    :return: String
    """
    return normalize('NFKD', element).encode('ascii', 'ignore')


def generate_key(element):
    """
    Generate a key based on the hashtag str (could be better)
    :param element: The tweet dictionary
    :return: String
    """
    return normalized(element[0:16]).lower()


def is_bad_format(element):
    """
    Just checking format
    TODO: Clean that garbage code
    :param element: The tweet dictionary
    :return: Boolean
    """
    sliced = normalized(element[0:16])

    return True if sliced in ['_', '__', '___', '__'] or len(sliced) < 3 else False


def reformat_tweet(tweet):
    """
    Extract the most useful keys as we don't want to pay for extra unused bytes
    :param tweet: The tweet dictionary
    :return: Dictionary
    """
    element = {
            "id"         : str(tweet["id"]),
            "timestamp"  : time.mktime(
                    time.strptime(tweet["created_at"], "%a %b %d %H:%M:%S +0000 %Y")),
            "hashtags"   : [
                    {"tag": key["text"], "key": generate_key(key["text"])}
                    for key
                    in
                    tweet["entities"]["hashtags"]
                    if not is_bad_format(key["text"])
            ],
            "coordinates": [k for k in tweet["coordinates"]["coordinates"]]

    }

    return element


class StdOutListener(StreamListener):
    """ The main listener """

    def __init__(self):
        super(StdOutListener, self).__init__()

    @classmethod
    def on_status(cls, dataset):
        # Working with dictionary
        tweet = dataset._json
        # Only dealing with geo-located tweets
        if tweet["coordinates"]:
            print (tweet)
            write_to_pubsub(reformat_tweet(tweet))

        return True

    @classmethod
    def on_timeout(cls):
        print('AYYY! Timeout.')
        return True

    @classmethod
    def on_error(cls, status):
        if status == 420:
            print('AYYY! Rate limit active.', status)
        return True


# Set a new listener
listener = StdOutListener()
# Define a new stream
stream = tweepy.Stream(auth, listener)
# Apply filters and run the stream
stream.filter(locations=WORLD_BOUNDS)

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
from conf.params import languages

# API CONFIGURATION
listener_1 = accounts["user_1"]
auth = tweepy.OAuthHandler(listener_1["consumer_key"], listener_1["consumer_secret"])
auth.set_access_token(listener_1["access_token"], listener_1["access_token_secret"])
api = tweepy.API(auth, wait_on_rate_limit=True, wait_on_rate_limit_notify=False)

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(project_id, pub_sub_input)


def write_to_pubsub(element):
    try:
        payload = json.dumps(element).encode("utf-8")
        publisher.publish(topic=topic_path,
                          data=payload,
                          event_id=element["id"])
    except Exception as exception:
        raise exception


def does_contain_hashtags(element):
    return True if element["entities"]["hashtags"] else False


def normalized(element):
    return normalize('NFKD', element).encode('ascii', 'ignore')


def generate_key(element):
    return normalized(element[0:16]).lower()


def is_bad_format(element):
    sliced = normalized(element[0:16])

    return True if sliced in ['_', '__', '___', '__'] or len(sliced) < 3 else False


def reformat_tweet(tweet):
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
    def __init__(self):
        super(StdOutListener, self).__init__()

    def on_status(self, dataset):
        tweet = dataset._json
        if tweet["coordinates"]:
            print (tweet)
            write_to_pubsub(reformat_tweet(tweet))

        return True

    def on_timeout(self):
        print('Timeout!')
        return True

    def on_error(self, status):
        if status == 420:
            print('Rate limit active!', status)
        return True


listener = StdOutListener()
stream = tweepy.Stream(auth, listener)
WORLD_BOUNDS = [-180, -90, 180, 90]
# FRANCE_BOUNDS = [-13.117676, 40.730608, 18.522949, 51.138001]
stream.filter(locations=WORLD_BOUNDS)

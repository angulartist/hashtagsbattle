# Source: Twitter's API listener built with Tweepy running on a Compute Engine VM
  
## About the directory

That's pretty straightforward. This directory contains a script built with Tweepy that creates a stream of tweets from the Twitter's API.
Basically, he just listens to the tweets, filters them and formats them.
Also, it has a Cloud Pub/Sub publisher that sends base 64 string events to the source topic, in aim to be processed by the Dataflow pipeline.

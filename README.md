> Note: Servers may be down cuz I'm really poor.

# Q/A

**Q: What's this?**

A: Hashtagsbattle is a Web App which displays some analytics, such as hourly trending hashtags, daily hashtags, worldwide activity... based on Twitter and in Real-Time. Inspired by the awesome [One Million Tweet Map](https://onemilliontweetmap.com).

**Q: How it works?**

A: 

- First of, there's a tweets listener built with [Tweepy](https://tweepy.readthedocs.io) which retrieves tweets sent back by the Twitter API. It does some basic cleaning and filtering before publishing them to a [Pub/Sub](https://cloud.google.com/pubsub/docs/overview) topic, which is basically a messaging bus. The listener is running on a [Google App Engine](https://cloud.google.com/appengine/) instance. 

- Then, there's a little [Express](https://expressjs.com/) server using [SocketIO](https://socket.io/). This application is also running on App Engine. There's an endpoint receiving Pub/Sub push messages and emiting events through a web socket. A portion of the data is cached in a [Redis](https://redislabs.com) instance.

- The heart of my project is the [Apache-Beam](https://beam.apache.org/) streaming processing pipeline running on the [Cloud Dataflow](https://cloud.google.com/dataflow) runner. This pipeline consumes events sent by the source Pub/Sub topic and it does some data transformations (grouping, counting, filtering, batching...) before sending back the pre-aggregated output to another Pub/Sub topic. I'm playing with some windows and some triggers to achieve a quite low-latency.

- Finally, the output Pub/Sub topic will trigger [Cloud Functions](https://cloud.google.com/functions/) instances that are going to do some computation on the data before saving it to [Firestore](https://firebase.google.com/docs/firestore).

The Web-App is built with [Stencil](https://stenciljs.com/) and it's deployed to [Firebase Hosting](https://firebase.google.com/docs/hosting).

As you can see, this is fully managed by Google Cloud Platform.

![GCPimplementation](https://i.imgur.com/8WWeGfa.png)

# TODO :
- [X] Use Pub/Sub push method instead of pull (lower latency)
- [ ] Migrate to BigTable
- [ ] UI
- [ ] Doc
...

# Installation

> Work in progress.

The application is made of 4 components. Almost each component is [Dockerized](https://www.docker.com/) and has it's own CI/CD pipeline using [Cloud Build](https://cloud.google.com/cloud-build). 

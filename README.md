> Note: Servers can be down cuz I'm really poor.

# Q/A

**Q: What's this?**

A: Hashtagsbattle is a Web App which displays some analytics, such as hourly trending hashtags, daily hashtags, worldwide activity... based on Twitter and in Real-Time. Inspired by the awesome [One Million Tweet Map](https://onemilliontweetmap.com).

**Q: How it works?**

A: 

- First of, there's a tweets listener built with [Tweepy](https://tweepy.readthedocs.io) which retrieves tweets sent back by the Twitter API. It does some basic cleaning and filtering before publishing them to a [Pub/Sub](https://cloud.google.com/pubsub/docs/overview) topic. The listener is running on a [Google App Engine](https://cloud.google.com/appengine/) instance. 

- Then, there's a little [Express](https://expressjs.com/) server using [SocketIO](https://socket.io/). This application is also running on App Engine. It's quite useful because I wanted to represent the current tweets location in Real-Time on a [Mapbox](https://www.mapbox.com/) map. Storing this data (in Firebase for example) isn't useful and will be quite expensive. 

- The heart of my project is the [Apache-Beam](https://beam.apache.org/) streaming processing pipeline running on the [Cloud Dataflow](https://cloud.google.com/dataflow) runner. This pipeline consumes events sent by the source Pub/Sub topic and it does some data transformations (grouping, counting, filtering, batching...) before sending back the pre-aggregated output to another Pub/Sub topic. I'm playing with some windows and some triggers to achieve a quite low-latency.

- Finally, the output Pub/Sub topic will trigger [Cloud Functions](https://cloud.google.com/functions/) instances that are going to do some computation on the data before saving it to [Firestore](https://firebase.google.com/docs/firestore).

The Web-App is built with [Stencil](https://stenciljs.com/) and it's deployed to [Firebase Hosting](https://firebase.google.com/docs/hosting).

As you can see, this is fully managed by Google Cloud Platform.

![GCPimplementation](https://camo.githubusercontent.com/112f0a46af60d9d806198e82ae58dde2ce145081/68747470733a2f2f692e696d6775722e636f6d2f4f4d7744307a592e706e67)


# Installation

> Work in progress.

The application is made of 4 components. Almost each component is [Dockerized](https://www.docker.com/) and has it's own CI/CD pipeline using [Cloud Build](https://cloud.google.com/cloud-build). 

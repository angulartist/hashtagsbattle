# NodeJS: Express/SocketIO micro-service running on GAE

## Table of Contents

* [About the project](#about-the-project)
* [Installation](#installation)
* [Cleaning](#cleaning)
* [Run the project](#run-the-project)
  * [Run locally (Classic)](#run-locally-classic)
  * [Run locally (Docker)](#run-locally-docker)
* [Deploy the project](#deploy-the-project)
  * [Deploy on Google App Engine (manually)](#deploy-on-google-app-engine-manually)
  * [Automating builds using build triggers (multiple environments)](#automating-builds-using-build-triggers-multiple-environments)
  
## About the project

This service contains my **push subscription** which will receive Cloud Pub/Sub messages. It does some computation on them before emitting values to the client through SocketIO.

It's using a [very fast geospatial point custering library](https://blog.mapbox.com/clustering-millions-of-points-on-a-map-with-supercluster-272046ec5c97) to do server-side clustering in aim to improve networking and client-side rendering.
 
## Installation

* Clone the repo and navigate to the **express/server/** folder

```sh
$ git clone git@github.com:angulartist/hashtagsbattle.git
$ cd express/server/
```

## Cleaning

- The **openapi-appengine.yaml** file describes the behiavour of [Cloud Endpoints](https://cloud.google.com/endpoints/), a proxy for your micro-services, to secure some of your endpoints. As the configuration requires additional steps for this, you can skip it and remove it for this demo.


## Run the project

### Run locally (Classic)

* Install dependencies

```sh
$ npm i
```

* Run the server

```sh
$ npm start
```

> App should be running on 127.0.0.1:8080

### Run locally (Docker)

> Make sure Docker is running on your OS

* Build a Docker container

```sh
$ docker build .
```

* Run the Docker container

```sh
$ docker run -p 8080:8080 xxxxxxxxxxxxx
```

> Note: xxxxxxxxxxxxx should be your Docker container id

> App should be running on 127.0.0.1:8080

## Deploy the project

### Deploy on Google App Engine (manually)

- Make sure you have set up your Google Cloud Project and have enabled billing and related APIs

Follow the [Before you begin part](https://cloud.google.com/appengine/docs/flexible/nodejs/quickstart)

- Put your project ID to the env variables inside the **express/server/app.flexible.yaml** file

```sh
env_variables:
  GOOGLE_CLOUD_PROJECT: YOUR_PROJECT_ID
```

- Grant App Engine access to the Cloud Build service account

Follow the [Grant App Engine access to the Cloud Build service account part](https://cloud.google.com/source-repositories/docs/quickstart-triggering-builds-with-source-repositories)

- Navigate to **express/** folder and run the CI/CD pipeline

```sh
$ sudo gcloud builds submit . --config=cloudbuild.yaml --substitutions=_VID=prod,_GAE_PROMOTE=--promote,_GAE_TRAFFIC=prod=1
```

Read more about [Cloud Build flags](https://cloud.google.com/appengine/docs/flexible/nodejs/testing-and-deploying-your-app)

> The **express-socketio** service should be created on App Engine

### Automating builds using build triggers (multiple environments)

![CICD pipeline](https://i.imgur.com/iTmjgkp.png)

Here is an example of how to setup auto builds with Cloud Build triggers. I'm using GitHub as a repository source and I've added two triggers : One to deploy features pushed on a **staging** branch and anotha' one to deploy features merged into **master**.

* When you commit something on staging, this gonna run the CI/CD pipeline and deploys a staging version of your service where the traffic is only 20% (for testing purposes).
* And when you merge features from staging to master, this gonna run the pipeline and deploys a prod version of your service, and ensure that it's receiving all traffic.

#### Create a new PROD trigger and specify the **Cloud build** configuration

* https://i.imgur.com/t0giFvP.png
* https://i.imgur.com/Zkg9niX.png

#### Create a new STAGING trigger and specify the **Cloud build** configuration

* https://i.imgur.com/yak6Osw.png
* https://i.imgur.com/CLuEBxE.png


#### Push some modifications, it's automagic! :fire:

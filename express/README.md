# Node: Express + SocketIO service running on GAE

This service contains my **push subscription** which will receive Cloud Pub/Sub messages and do some computation on them before emitting values to the client through SocketIO.

### Installation

* Clone the repo and navigate to the **express/server/** folder

```sh
$ git clone git@github.com:angulartist/hashtagsbattle.git
$ cd express/server/
```

### Cleaning

- The **openapi-appengine.yaml** file is only required to secure some of your endpoints. This is optional and can be removed.

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

> _VID could be any version name...

> The **express-socketio** service should be created on App Engine

### Automating builds using build triggers (multiple environments)

Here is an example of how to setup auto builds with Cloud Build triggers. I'm using github as a repository source and I've added two triggers : one to deploy features pushed on a **staging** branch and another one to deploy features merged into **master**.
When you commit something on staging, this gonna run the CI/CD pipeline and deploy a staging version of your service where the traffic is only 20% (for testing purposes). And when you merge features from staging to master, this gonna run the pipeline and deploy a prod version of your service with 100% of the traffic.

- Create a new PROD trigger and specify the **Cloud build** configuration

> Note: If you have any substitution variables such as _VID, add them.

* [PROD trigger configuration p1](https://i.imgur.com/t0giFvP.png)
* [PROD trigger configuration p2](https://i.imgur.com/Zkg9niX.png)

- Create a new PROD trigger and specify the **Cloud build** configuration

> Note: If you have any substitution variables such as _VID, add them.

* [STAGING trigger configuration p1](https://i.imgur.com/yak6Osw.png)
* [STAGING trigger configuration p2](https://i.imgur.com/CLuEBxE.png)

You should end up with something like that:

* [TRIGGERS](https://i.imgur.com/dtFGy1S.png)


## Push some modifications, it's automagic! :fire:

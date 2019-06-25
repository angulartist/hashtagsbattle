const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const cache = require('memory-cache')


io.on('connection', socket => {
    io.emit('connected')

    socket.on('disconnect', () => {
        io.sockets.emit('disconnect')
    })
})

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/tpl/index.html`)
})

app.post('/push', (req, res) => {

    if (!req.body) {
        const msg = 'no Pub/Sub message received'
        console.error(`error: ${msg}`)
        res.status(400).send(`Bad Request: ${msg}`)
        return
    }
    if (!req.body.message) {
        const msg = 'invalid Pub/Sub message format'
        console.error(`error: ${msg}`)
        res.status(400).send(`Bad Request: ${msg}`)
        return
    }

    const pubSubMessage = req.body.message

    const tweet = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())

    io.emit('tweet', tweet)

    console.log(`Received ${tweet.event_id}!`)

    res.status(204).send()
})

// # LOCAL TESTING ONLY # //

const {PubSub} = require(`@google-cloud/pubsub`)

const pubsub = new PubSub()

const subscriptionName = 'projects/notbanana-7f869/subscriptions/new_tweets'
const timeout = 60

const subscription = pubsub.subscription(subscriptionName)

let messageCount = 0

/**
 * Handler for received message.
 * @param {Object} message
 */
const messageHandler = message => {
    // console.log(`Received message ${message.id}:`)
    // console.log(`Data: ${message.data}`)
    // console.log(`tAttributes: ${message.attributes}`)
    messageCount += 1

    cache.put('count', messageCount)
    // Ack the messae
    message.ack()
}

setInterval(() => {
    console.log(cache.get('count'))
    messageCount = 0
}, 1 * 60 * 1000)

const point = {
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [125.6, 10.1]
  },
  "properties": {
    "name": "Dinagat Islands"
  }
}


// Listen for new messages until timeout is hit
subscription.on(`message`, messageHandler)

module.exports = http

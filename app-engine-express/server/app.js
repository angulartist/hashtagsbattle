const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const NodeCache = require('node-cache')

const ttl = 60 * 60 // cache for 1 Hour

const cache = new NodeCache({
    stdTTL: ttl,
    checkperiod: ttl * 0.2,
    useClones: false
})

io.on('connection', socket => {
    io.emit('connected')

    getLocations()

    socket.on('disconnect', () => {
        io.emit('disconnect')
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

    const {id, coordinates} = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())

    const [lat, lng] = coordinates

    putLocation({id, lat, lng})

    res.status(204).send()
})

// # LOCAL TESTING ONLY # //

const {PubSub} = require(`@google-cloud/pubsub`)
const pubsub = new PubSub()
const subscriptionName = 'projects/notbanana-7f869/subscriptions/new_tweets'
const subscription = pubsub.subscription(subscriptionName)


const messageHandler = message => {
    message.ack()

    const {id, coordinates} = JSON.parse(Buffer.from(message.data, 'base64').toString())

    const [lat, lng] = coordinates

    putLocation({id, lat, lng})
}

subscription.on(`message`, messageHandler)


cache.set('locations', [])

function putLocation(location) {
    io.emit('location', location)

    let locations = cache.get('locations')

    // if (locations.length > 10000) {
    //     locations = locations.slice(0, 9990)
    // }

    cache.set('locations', [location, ...locations])
}

function getLocations() {
    let locations = cache.get('locations')

    io.emit('locations', locations)

    console.log('emited', locations.length)
}

setInterval(() => getLocations(), 10 * 1000)


module.exports = http

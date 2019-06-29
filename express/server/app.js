const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const NodeCache = require('node-cache')
const Supercluster = require('supercluster')
const faker = require('faker')

const LOCATION_KEY = 'locations' // stored in memory
const BATCH_KEY = 'batch' // stored in memory
const MAX_LOCATIONS = 50000 // max tweets
const MAX_BATCH_SIZE = 20 // update every X

const cache = new NodeCache({
    useClones: false
})

const index = new Supercluster({
    radius: 40,
    maxZoom: 16
})

/**
 * SOCKET IO
 */
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

/**
 * PUB/SUB PUSH ENDPOINT
 */
app.post('/push', (req, res) => {
    // Checking bad format
    const {body} = req
    if (!body) {
        const msg = 'no Pub/Sub message received'
        console.error(`error: ${msg}`)
        res.status(400).send(`Bad Request: ${msg}`)
        return
    }
    if (!body.message) {
        const msg = 'invalid Pub/Sub message format'
        console.error(`error: ${msg}`)
        res.status(400).send(`Bad Request: ${msg}`)
        return
    }

    // Retrieve + ACK
    const pubSubMessage = req.body.message
    const {coordinates} = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())
    const [lat, lng] = coordinates
    putLocation(`${lat}_${lng}`)
    res.status(204).send()
})

// # LOCAL TESTING ONLY # //

// const {PubSub} = require(`@google-cloud/pubsub`)
// const pubsub = new PubSub()
// const subscriptionName = 'projects/notbanana-7f869/subscriptions/new_tweets'
// const subscription = pubsub.subscription(subscriptionName)
//
// const messageHandler = message => {
//     const {coordinates} = JSON.parse(Buffer.from(message.data, 'base64').toString())
//
//     putLocation(`${coordinates[0]}_${coordinates[1]}`)
//
//     message.ack()
// }
//
// subscription.on(`message`, messageHandler)


function initCache() {
    // Cache keys
    cache.set('locations', [])
    cache.set('batch', [])
    // Cache events
    cache.on('set', (key, batch) => {
        if (key !== BATCH_KEY) return

        if (batch.length >= MAX_BATCH_SIZE) {
            io.emit('batch', batch)
            console.info('emitted', batch.length, 'items')
        }
    })
    console.info('Initialized cache!!!')

    let i = 0
    let features = []

    while (i <= 10000) {
        const feature =
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [faker.address.latitude(), faker.address.longitude()]
                }
            }
        features = [feature, ...features]
        i++
        console.log(i)
    }

    index.load(features)

    const clusters = index.getClusters([-180, -85, 180, 85], 2)

    console.log(clusters)
}


function printKiloBytes(tag, str) {
    console.log(tag, Buffer.byteLength(str, 'utf8') / 1024, str.length)
}

function putLocation(location) {
    const batch = cache.get(BATCH_KEY)
    if (batch.length >= MAX_BATCH_SIZE) {
        let locations = cache.get(LOCATION_KEY)
        if (locations.length >= MAX_LOCATIONS) {
            locations = locations.slice(0, MAX_LOCATIONS - MAX_BATCH_SIZE)
        }
        cache.set(BATCH_KEY, [])
        cache.set(LOCATION_KEY, [...batch, ...locations])
    } else {
        cache.set(BATCH_KEY, [location, ...batch])
    }
}

function getLocations() {
    const locations = cache.get('locations')
    io.emit('locations', locations)
}

initCache()

module.exports = http

const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const NodeCache = require('node-cache')
const clusterify = require('supercluster')

const LOCATION_KEY = 'locations' // stored in memory
const BATCH_KEY = 'batch' // stored in memory
const MAX_LOCATIONS = 500000 // max tweets
const MAX_BATCH_SIZE = 25 // update every X

const cache = new NodeCache({
    useClones: false
})

/**
 * SOCKET IO
 */
io.on('connection', socket => {
    io.emit('connected')

    socket.on('disconnect', () => {
        io.emit('disconnect')
    })

    // Has user moved the map?
    socket.on('map updated', (coords) => {
        emitClusters(coords)
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
    const location = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [lat, lng]
        }
    }
    putLocation(location)
    emitLocation(location)
    res.status(204).send()
})

function emitLocation(location) {
    io.emit('dot', location)
}

// # LOCAL TESTING ONLY # //

const {PubSub} = require(`@google-cloud/pubsub`)
const pubsub = new PubSub()
const subscriptionName = 'projects/notbanana-7f869/subscriptions/new_tweets'
const subscription = pubsub.subscription(subscriptionName)

const messageHandler = message => {
    const {coordinates} = JSON.parse(Buffer.from(message.data, 'base64').toString())
    const [lat, lng] = coordinates
    console.log(coordinates)
    // const location = {
    //     'type': 'Feature',
    //     'geometry': {
    //         'type': 'Point',
    //         'coordinates': [lat, lng]
    //     }
    // }
    // putLocation(location)
    // emitLocation(location)
    message.ack()
}

subscription.on(`message`, messageHandler)

// Builds clusters from locations and emits them
function emitClusters([bbox, zoom]) {
    const locations = cache.get(LOCATION_KEY)

    // Compute only the current user zoom
    const index = new clusterify({
        radius: 120,
        maxZoom: Math.floor(zoom),
        minZoom: Math.floor(zoom),
        log: true
    })

    index.load(locations)
    const clusters = index.getClusters(bbox, Math.floor(zoom))
    io.emit('clusters', clusters)
}

// Init in-memory cache
function initCache() {
    // Cache keys
    cache.set('locations', [])
    cache.set('batch', [])
    // Cache events
    cache.on('set', (key, batch) => {
        if (key !== BATCH_KEY) return

        if (batch.length >= MAX_BATCH_SIZE) {
            io.emit('ask for coords')
        }
    })
    console.info('Initialized cache!!!')
}

// Add a new location
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

// Helper
function printKiloBytes(tag, str) {
    console.log(tag, Buffer.byteLength(str, 'utf8') / 1024, str.length)
}

initCache()

module.exports = http

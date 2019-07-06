const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const NodeCache = require('node-cache')
const Cluster = require('supercluster')

/* Currently limiting clusters to a hundred thousand points */
const LOCATION_KEY = 'locations' // stored in memory
const BATCH_KEY = 'batch' // stored in memory
const MAX_LOCATIONS = 100000 // max tweets
const MAX_BATCH_SIZE = 5 // update every X new tweets

/* Init the cache */
const cache = new NodeCache({
    useClones: false
})

/* SocketIO stuff */
io.on('connection', socket => {
    io.emit('connected')

    socket.on('disconnect', () => {
        io.emit('disconnect')
    })

    // Has user updated the map coords/zoom?
    socket.on('map updated', (coords) => {
        emitClusters(coords)
    })
})

app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/tpl/index.html`)
})

/* Endpoint handling Pub/Sub push subscription */
app.post('/push', (req, res) => {
    /* Checking bad format */
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

    /* Retrieve tweets */
    const pubSubMessage = req.body.message
    const {coordinates} = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())
    /* Extract coordinates */
    const [lat, lng] = coordinates
    /* Build a geojson-compliant feature object */
    const location = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [lat, lng]
        }
    }
    /* Caching */
    putLocation(location)
    /* Red dot thing... */
    emitLocation(location)
    /* ACK the message to remove the event from the Pub/Sub buffer */
    res.status(204).send()
})

/* For the little-red-fancy-dotness you know */
const emitLocation = (location) => io.emit('dot', location)

// Builds clusters from locations and emits them
const emitClusters = ([bbox, zoom]) => {
    /* We don't care about precision for the sake of this demo */
    const approxZoom = Math.floor(zoom)
    /* Retrieve the locations stored in the memory */
    const locations = cache.get(LOCATION_KEY)
    /* Compute clusters only for the current Zoom layer */
    const index = new Cluster({
        radius: 70,
        maxZoom: approxZoom,
        minZoom: approxZoom,
        log: true
    })
    /* Build the index */
    index.load(locations)
    /* Emit clusters through web-socket */
    io.emit('clusters', index.getClusters(bbox, approxZoom))
}

/* Init in-memory cache keys and set up event listeners */
const initCache = () => {
    // Set cache keys
    cache.set('locations', [])
    cache.set('batch', [])
    // Set cache event listeners
    cache.on('set', (key, batch) => {
        /* Only dealing with batched writes */
        if (key !== BATCH_KEY) return
        /* As we got MAX_BATCH_SIZE more locations, ask client for it's camera info */
        if (batch.length >= MAX_BATCH_SIZE) {
            io.emit('ask for coords')
        }
    })
}

/* Save a new location to the memory */
const putLocation = (location) => {
    /* Retrieve current batch */
    const batch = cache.get(BATCH_KEY)
    /* If the batch size is has reached the limit, store locations... */
    if (batch.length >= MAX_BATCH_SIZE) {
        let locations = cache.get(LOCATION_KEY)
        if (locations.length >= MAX_LOCATIONS) {
            locations = locations.slice(0, MAX_LOCATIONS - MAX_BATCH_SIZE)
        }
        cache.set(BATCH_KEY, [])
        cache.set(LOCATION_KEY, [...batch, ...locations])
        /* ... otherwise fill up the batch */
    } else {
        cache.set(BATCH_KEY, [location, ...batch])
    }
}

/* That's ugly but whatever ¯\_(ツ)_/¯ *dab* */
initCache()

module.exports = http

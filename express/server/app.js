const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const NodeCache = require('node-cache')

const LOCATION_KEY = 'locations'
const BATCH_KEY = 'batch'
const MAX_LOCATIONS = 100000
const MAX_BATCH_SIZE = 20

const cache = new NodeCache({
    useClones: false
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

    // ACK the message
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
    cache.set('locations', [])
    cache.set('batch', [])

    cache.on('set', function (key, data) {
        if (key !== LOCATION_KEY) return

        io.emit(LOCATION_KEY, data)

        console.info('emitted', data.length, 'items')

        printKiloBytes('array', JSON.stringify(data))
    })

    console.info('Initialized cache!!!')
}


function printKiloBytes(tag, str) {
    console.log(tag, Buffer.byteLength(str, 'utf8') / 1024, str.length)
}

function putLocation(location) {
    let batch = cache.get(BATCH_KEY)

    if (batch.length >= MAX_BATCH_SIZE) {
        let locations = cache.get(LOCATION_KEY)

        if (locations.length >= MAX_LOCATIONS) {
            locations = locations.slice(0, MAX_LOCATIONS - MAX_BATCH_SIZE)
        }

        cache.set(LOCATION_KEY, [...batch, ...locations])

        resetBatch()
    } else {
        cache.set(BATCH_KEY, [location, ...batch])
    }
}

function resetBatch() {
    cache.set(BATCH_KEY, [])
}


function getLocations() {
    let locations = cache.get('locations')

    io.emit('locations', locations)
}

initCache()

module.exports = http

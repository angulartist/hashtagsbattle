const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const redis = require('redis')
const nconf = require('nconf')

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

// app.post('/push', (req, res) => {
//
//     if (!req.body) {
//         const msg = 'no Pub/Sub message received'
//         console.error(`error: ${msg}`)
//         res.status(400).send(`Bad Request: ${msg}`)
//         return
//     }
//     if (!req.body.message) {
//         const msg = 'invalid Pub/Sub message format'
//         console.error(`error: ${msg}`)
//         res.status(400).send(`Bad Request: ${msg}`)
//         return
//     }
//
//     const pubSubMessage = req.body.message
//
//     const tweet = JSON.parse(Buffer.from(pubSubMessage.data, 'base64').toString())
//
//     io.emit('tweet', tweet)
//
//     console.log(`Received ${tweet.event_id}!`)
//
//     res.status(204).send()
// })

// # LOCAL TESTING ONLY # //

const {PubSub} = require(`@google-cloud/pubsub`)
const pubsub = new PubSub()
const subscriptionName = 'projects/notbanana-7f869/subscriptions/new_tweets'
const subscription = pubsub.subscription(subscriptionName)


let locations = 0

const messageHandler = message => {
    message.ack()

    const {id, coordinates} = JSON.parse(Buffer.from(message.data, 'base64').toString())

    const [lat, lng] = coordinates

    setLocation({id, lat, lng})
}

subscription.on(`message`, messageHandler)


nconf.argv()
    .env()
    .file('./key.json')

// Redis Client
const client = redis
    .createClient(
        nconf.get('redisPort') || '6379',
        nconf.get('redisHost') || '127.0.0.1',
        {
            auth_pass: nconf.get('redisKey'),
            return_buffers: true
        }
    )
    .on('connect', () => console.log('Connected!'))
    .on('error', err => console.error('ERR:REDIS:', err))


function setLocation({id, lat, lng}) {
    client.sadd('locations', id)

    client.set(`locations:${id}`, JSON.stringify(
        {id, lat, lng}
    ), (err, status) => {
        if (err) throw new Error(err)
        else {
            console.log(status)
            checkLocations()
        }
    })
}

function checkLocations() {
    console.log(locations)

    if (locations >= 20) {
        getLocations()
        locations = 0
        // popLocations()
    } else {
        locations++
    }
}

function popLocations() {
    client.spop('locations', 20, (err, status) => {
        if (err) throw new Error(err)
        else {
            console.log('Popped!', status)
            getLocations()
        }
    })
}


function getLocations() {
    console.log('called')
    client.smembers('locations', (err, keys) => {
        if (err) throw new Error(err)
        else if (keys) client.mget(keys.map(k => `locations:${k}`), (e, values) => {
            io.emit('locations', values.map(v => JSON.parse(v)))
        })
    })
}


function flushCache() {
    client.flushdb((err, succeeded) => {
        if (err) throw new Error(err)
        console.log(Buffer.from(succeeded, 'base64').toString())
    })
}

flushCache()


module.exports = http

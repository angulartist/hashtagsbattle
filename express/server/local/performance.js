const Supercluster = require('supercluster')
const turfRandom = require('@turf/random')

// # LOCAL TESTING ONLY # //
const {PubSub} = require(`@google-cloud/pubsub`)
const pubsub = new PubSub()
const subscriptionName = 'projects/notbanana-7f869/subscriptions/new_tweets'
const subscription = pubsub.subscription(subscriptionName)

const messageHandler = message => {
    const {coordinates} = JSON.parse(Buffer.from(message.data, 'base64').toString())
    const [lat, lng] = coordinates
    console.log(coordinates)
    const location = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [lat, lng]
        }
    }
    putLocation(location)
    emitLocation(location)
    message.ack()
}

subscription.on(`message`, messageHandler)

const index = new Supercluster({
    radius: 100,
    maxZoom: 8,
    log: true
})

setInterval(() => {
    // generate random points
    let points = turfRandom('points', 10000, {
        bbox: [-175, -85, 175, 85]
    })

    points.features = points.features.map(p => {
        p.properties.p_id = Math.random().toString(36).slice(2)
        return p
    })

    points.features.forEach(feature => putLocation(feature))

}, 10000)
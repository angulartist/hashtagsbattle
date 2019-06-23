'use strict'


const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const {PubSub} = require('@google-cloud/pubsub')

const SUBSCRIPTION = 'new_tweets'

function notifyClient(element) {
    io.emit('tweet', element)
}

function listenForMessages(subscriptionName) {
    const pubsub = new PubSub()
    const subscription = pubsub.subscription(subscriptionName)

    const messageHandler = (message) => {
        console.log(`Received message ${message.id}:`)
        message.ack()
        notifyClient(JSON.parse(Buffer.from(message.data, 'base64').toString()))
    }

    subscription.on(`message`, messageHandler)
}

app.get('/', (req, res) => {
    res.sendFile(`${__dirname}/tpl/index.html`)
})

io.on('connection', socket => {
    io.emit('connected')

    socket.on('disconnect', () => {
        io.sockets.emit('disconnect')
    })
})


if (module === require.main) {
    const PORT = process.env.PORT || 8080
    http.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`)
        console.log('Press Ctrl+C to quit.')
        listenForMessages(SUBSCRIPTION)
    })
}

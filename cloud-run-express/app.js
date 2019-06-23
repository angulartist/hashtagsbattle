const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)

app.use(bodyParser.json())

io.on('connection', socket => {
    io.emit('connected')

    socket.on('disconnect', () => {
        io.sockets.emit('disconnect')
    })
})

app.post('/d', (req, res) => {

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
    const msg = Buffer.from(pubSubMessage.data, 'base64').toString()

    console.log('received:', msg)
    io.emit('tweet', msg)
    res.status(204).send()
})


module.exports = app

const bodyParser = require('body-parser')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)

console.log('UNICORN WORLD v6!!!')

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
    const name = pubSubMessage.data
        ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
        : 'World'

    io.emit('tweet', name)

    console.log(`Hello ${name}!`)
    res.status(204).send()
})


module.exports = http

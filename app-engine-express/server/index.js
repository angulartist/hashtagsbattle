const app = require('./app.js')
const PORT = process.env.PORT || 8080

app.listen(PORT, () => console.log(`nodejs-express-server listening on port ${PORT}`))

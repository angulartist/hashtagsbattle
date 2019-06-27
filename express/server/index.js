const http = require('./app.js')
const PORT = process.env.PORT || 8080

http.listen(PORT, () => console.log(`nodejs-express-server listening on port ${PORT}`))

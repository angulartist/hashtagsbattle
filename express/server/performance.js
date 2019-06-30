const Supercluster = require('supercluster')
const turfRandom = require('@turf/random')

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
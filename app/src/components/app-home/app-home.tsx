import {Component, h, State} from '@stencil/core'
import io from 'socket.io-client'
import mapboxgl from 'mapbox-gl'

import {SOCKET_ENDPOINT} from '../../conf'

mapboxgl.accessToken = 'pk.eyJ1Ijoiam9obmRvZTY5IiwiYSI6ImNqeDhwYnp5bDBsbmUzb290dDY2Ynd6dWwifQ.I9CRLsBtq8B1I-RyqGms4A'

@Component({
  tag: 'app-home',
  styleUrl: 'app-home.css'
})
export class AppHome {
  mapElement: HTMLDivElement
  map: any
  socket: any
  geojson = {
    'type': 'FeatureCollection',
    'features': []
  }
  tmpGeojson = {
    'type': 'FeatureCollection',
    'features': []
  }

  @State() numLocations: number = 0

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
  }

  componentDidLoad() {
    const map: any = new mapboxgl.Map({
      container: this.mapElement,
      style: 'mapbox://styles/mapbox/light-v9',
      zoom: 3
    })

    const size = 50

    const pulsingDot = {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),

      onAdd: function () {
        const canvas = document.createElement('canvas')
        canvas.width = this.width
        canvas.height = this.height
        this.context = canvas.getContext('2d')
      },

      render: function () {
        const duration = 500
        const t = (performance.now() % duration) / duration

        const radius = size / 2 * 0.3
        const outerRadius = size / 2 * 0.7 * t + radius
        const context = this.context

        context.clearRect(0, 0, this.width, this.height)
        context.beginPath()
        context.arc(this.width / 2, this.height / 2, outerRadius, 0, Math.PI * 2)
        context.fillStyle = 'rgba(255, 200, 200,' + (1 - t) + ')'
        context.fill()

        context.beginPath()
        context.arc(this.width / 2, this.height / 2, radius, 0, Math.PI * 2)
        context.fillStyle = 'rgba(255, 100, 100, 1)'
        context.strokeStyle = 'white'
        context.lineWidth = 2 + 4 * (1 - t)
        context.fill()
        context.stroke()

        this.data = context.getImageData(0, 0, this.width, this.height).data

        map.triggerRepaint()

        return true
      }
    }

    map.on('load', () => {
      map.loadImage('https://i.imgur.com/YVAY5dJ.png', function (error, image) {
        if (error) throw error
        map.addImage('twitter', image)
      })

      map.addImage('pulsing-dot', pulsingDot, {pixelRatio: 2})

      map.addSource('tmp-source', {type: 'geojson', data: this.tmpGeojson})

      map.addLayer({
        id: 'tmp-dot',
        type: 'symbol',
        source: 'tmp-source',
        'layout': {
          'icon-image': 'pulsing-dot'
        }
      })

      map.addSource('tweets-source', {
        type: 'geojson', data: this.geojson, cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      })

      map.addLayer({
        id: 'tweets-layer',
        type: 'circle',
        source: 'tweets-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40
          ]
        }
      })

      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'tweets-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        }
      })

      map.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'tweets-source',
        filter: ['!', ['has', 'point_count']],
        'layout': {
          'icon-image': 'twitter',
          'icon-size': 0.25
        }
      })
    })

    this.map = map
  }

  establishSocket() {
    this.socket = io(SOCKET_ENDPOINT)
  }

  monitorEvents() {
    this.socket.on('connected', () => AppHome.logger('Connection ACK'))

    this.socket.on('locations', (locations: any[]) => this.updateLocations(locations))

    this.socket.on('location', (location: any) => this.pingMap(location))
  }

  pingMap({lat, lng}: any) {
    this.numLocations++

    this.tmpGeojson.features = [{
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [lat, lng]}
    }, ...this.tmpGeojson.features.slice(0, 50)]

    if (this.map.getSource('tmp-source')) this.map.getSource('tmp-source').setData(this.tmpGeojson)
  }

  updateLocations(locations: any[]) {
    this.geojson.features = locations.map(({lat, lng}) => ({
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [lat, lng]}
    }))

    if (this.map.getSource('tweets-source')) this.map.getSource('tweets-source').setData(this.geojson)
  }

  // handleTweetEvent(element) {
  //   this.processedTweets++
  //
  //   const point = {
  //     type: 'Feature',
  //     geometry: element.location
  //   }
  //
  //   this.geojson.features.push(point)
  //
  //   if (this.map.getSource('tweets-source')) this.map.getSource('tweets-source').setData(this.geojson)
  // }

  static logger(smth) {
    console.log(smth)
  }

  render() {
    return (
      <div class='app-home'>
        <div class="tw__timeline">
          <div class="tw__title">
            <i class="fab fa-twitter"/>
            <span>{this.numLocations}</span></div>
        </div>
        <div ref={(el) => this.mapElement = el} id="map"/>
      </div>
    )
  }
}

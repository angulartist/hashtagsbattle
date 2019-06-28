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
  batchSize: number = 20
  maxLocations: number = 50000
  mapElement: HTMLDivElement
  map: any
  socket: any
  geojson = {
    'type': 'FeatureCollection',
    'features': []
  }

  @State() numLocations: number = 0
  @State() isConnected: boolean = false

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
  }

  componentDidLoad() {
    if (this.map) return false

    const map: any = new mapboxgl.Map({
      container: this.mapElement,
      style: 'mapbox://styles/mapbox/light-v9',
      center: [-5, 10],
      zoom: 2
    })

    map.on('load', () => {
      map.loadImage('https://i.imgur.com/YVAY5dJ.png', function (error, image) {
        if (error) throw error
        map.addImage('twitter', image)
      })

      map.addSource('tweets', {
        type: 'geojson', data: this.geojson, cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 70
      })

      map.addLayer({
        id: 'tweets-layer',
        type: 'circle',
        source: 'tweets',
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
        source: 'tweets',
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
        source: 'tweets',
        filter: ['!', ['has', 'point_count']],
        'layout': {
          'icon-image': 'twitter',
          'icon-size': 0.25,
          'icon-allow-overlap': true
        }
      })
    })

    this.map = map
  }

  establishSocket() {
    this.socket = io(SOCKET_ENDPOINT)
  }

  monitorEvents() {
    this.socket.on('connected', () => {
      AppHome.logger('Connection ACK!')
      this.isConnected = true
    })
    this.socket.on('locations', (locations: any[]) => this.setLocations(locations))
    this.socket.on('batch', (batch: any[]) => this.updateLocations(batch))
  }

  setLocations(locations: any[]) {
    console.log(locations)

    this.geojson.features = locations.map((key: string) => ({
      type: 'Feature',
      geometry: {type: 'Point', coordinates: key.split('_')}
    }))

    if (this.map.getSource('tweets')) this.map.getSource('tweets').setData(this.geojson)
  }

  updateLocations(batch: any[]) {
    console.log(batch)

    const numLocations = this.geojson.features.length
    const sliced = this.geojson.features.slice(this.maxLocations - this.batchSize)

    if (numLocations >= this.maxLocations) {
      this.geojson.features = [...batch.map((key: string) => ({
        type: 'Feature',
        geometry: {type: 'Point', coordinates: key.split('_')}
      })), ...sliced]
    } else {
      this.geojson.features = [...batch.map((key: string) => ({
        type: 'Feature',
        geometry: {type: 'Point', coordinates: key.split('_')}
      })), ...this.geojson.features]
    }

    console.log(this.geojson.features.length)


    if (this.map.getSource('tweets')) this.map.getSource('tweets').setData(this.geojson)
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
        {this.isConnected ? (
          <div class="live">
            <div class="live__ring"/>
            <div class="live__circle"/>
          </div>
        ) : <div/>}
        <div class="tw__timeline">
          <div class="tw__title">
            <i class="fab fa-twitter"/>
            <span>{this.numLocations}</span>
          </div>
        </div>
        <div ref={(el) => this.mapElement = el} id="map"/>
      </div>
    )
  }
}

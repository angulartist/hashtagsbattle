import {Component, h, State} from '@stencil/core'
import io from 'socket.io-client'
import mapboxgl from 'mapbox-gl'

import {LOCAL} from '../../conf'

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

  @State() processedTweets: number = 0

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
  }

  componentDidLoad() {
    const map: any = new mapboxgl.Map({
      container: this.mapElement,
      style: 'mapbox://styles/mapbox/dark-v10'
      // maxBounds: [-7.117676, 41.730608, 10.522949, 51.138001]
    })

    map.on('load', () => {
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
        type: 'circle',
        source: 'tweets-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#11b4da',
          'circle-radius': 4,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      })
    })

    this.map = map
  }

  establishSocket() {
    this.socket = io(LOCAL)
  }

  monitorEvents() {
    this.socket.on('connected', () => AppHome.logger('Connection ACK'))

    // this.socket.on('tweet', (element) => this.handleTweetEvent(element))

    this.socket.on('locations', (locations: any[]) => this.updateLocations(locations))
  }

  updateLocations(locations: any[]) {
    this.processedTweets = locations.length

    const points = locations.map(({lat, lng}) => ({
      type: 'Feature',
      geometry: {type: 'Point', coordinates: [lat, lng]}
    }))

    console.log(points)

    this.geojson.features = points

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
        <div class="ol__events">
          <div class="title">
            {this.processedTweets}
          </div>
          <div class="subtitle">
            Tweets processed
          </div>
        </div>
        <div ref={(el) => this.mapElement = el} id="map"/>
      </div>
    )
  }
}

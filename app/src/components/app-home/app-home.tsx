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
  clustersGeo: any[] = [[], 0]

  @State() isConnected: boolean = false
  @State() sizeLocations: number = 0

  handleClustering() {
    if (!this.socket) throw new Error('socket hasnt been initialized yet!')
    if (!this.clustersGeo.length) throw new Error('No geo for retrieving clusters!')
    const [bbox, zoom] = this.clustersGeo
    this.socket.emit('map updated', ([bbox, zoom]))
  }

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
      zoom: 2,
      hash: true
    })

    const prepareCluster = () => {
      const bounds = map.getBounds()
      const bbox = [
        bounds._sw.lng,
        bounds._sw.lat,
        bounds._ne.lng,
        bounds._ne.lat
      ]
      this.clustersGeo = [bbox, map.getZoom()]
      this.handleClustering()
    }

    map.on('moveend', () => prepareCluster())

    map.on('load', () => {
      prepareCluster()

      map.loadImage('https://i.imgur.com/YVAY5dJ.png', function (error, image) {
        if (error) throw error
        map.addImage('twitter', image)
      })

      map.addSource('tweets', {
        type: 'geojson', data: this.geojson
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
    this.socket.on('clusters', (clusters: any[]) => {
      this.setClusters(clusters)
      this.computeSizeLocations(clusters)
    })
    this.socket.on('ask for coords', () => this.handleClustering())
    this.socket.on('dot', (location: any) => this.setDot(location))
  }

  setDot(location: any) {
    const el = document.createElement('div')
    el.className = 'marker'
    el.innerHTML = `<div></div>`
    el.addEventListener('webkitAnimationEnd', () => {
      el.remove()
    }, false)

    new mapboxgl.Marker(el)
      .setLngLat(location.geometry.coordinates)
      .addTo(this.map)
  }

  computeSizeLocations(clusters: any[]) {
    this.sizeLocations = clusters
      .filter(c => c.properties)
      .reduce((acc: number, cluster: any) =>
        acc + cluster.properties.point_count, 0)
  }

  setClusters(clusters: any[]) {
    console.log(clusters)

    this.geojson.features = clusters

    if (this.map.getSource('tweets')) this.map.getSource('tweets').setData(this.geojson)
  }

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
            <div>
              <span>{this.sizeLocations}</span>
            </div>
          </div>
          <div class="tw__sub">
            Tweet locations shown
          </div>
        </div>
        <div ref={(el) => this.mapElement = el} id="map"/>
      </div>
    )
  }
}

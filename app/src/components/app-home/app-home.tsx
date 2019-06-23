import {Component, h, State} from '@stencil/core'
import io from 'socket.io-client'
import mapboxgl from 'mapbox-gl'

import {DEV_SOCKET_ENDPOINT} from '../../conf'

mapboxgl.accessToken = 'pk.eyJ1Ijoiam9obmRvZTY5IiwiYSI6ImNqeDhwYnp5bDBsbmUzb290dDY2Ynd6dWwifQ.I9CRLsBtq8B1I-RyqGms4A'


@Component({
  tag: 'app-home',
  styleUrl: 'app-home.css'
})
export class AppHome {
  mapElement: HTMLDivElement
  map: any
  socket: any

  @State() tweetsQueue: any[] = []

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
  }

  componentDidLoad() {
    const map: any = new mapboxgl.Map({
      container: this.mapElement,
      style: 'mapbox://styles/mapbox/dark-v10'
    })

    const size = 200

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
        const duration = 1000
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
      map.addImage('pulsing-dot', pulsingDot, {pixelRatio: 2})
    })

    this.map = map
  }

  establishSocket() {
    this.socket = io(DEV_SOCKET_ENDPOINT)
    console.log(this.socket)
  }

  monitorEvents() {
    this.socket.on('connected', () => AppHome.logger('Connection ACK'))

    this.socket.on('tweet', (element) => this.handleTweetEvent(element))
  }

  handleTweetEvent(element) {
    const obj = {
      'geometry': element.location,
      'type': 'Feature',
      'properties': {}
    }

    this.map.addSource(element.event_id, {type: 'geojson', data: obj})
    this.map.addLayer({
      'id': element.event_id,
      'type': 'symbol',
      'source': element.event_id,
      'layout': {
        'icon-image': 'pulsing-dot',
        'icon-size': 0.3
      }
    })

    setTimeout(() => {
      this.map.removeLayer(element.event_id)
      this.map.removeSource(element.event_id)
    }, 10000)

    if (this.tweetsQueue.length >= 20)
      this.tweetsQueue.pop()

    this.tweetsQueue = [element, ...this.tweetsQueue]
  }

  static logger(smth) {
    console.log(smth)
  }

  render() {
    return (
      <div class='app-home'>
        {/*<div>*/}
        {/*  Socket.io*/}

        {/*  {this.tweetsQueue.map((tweet: any) => (*/}
        {/*    <div>*/}
        {/*      {tweet.id}*/}
        {/*    </div>*/}
        {/*  ))}*/}
        {/*</div>*/}
        <div ref={(el) => this.mapElement = el} id="map"></div>
      </div>
    )
  }
}

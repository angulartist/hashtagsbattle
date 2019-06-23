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
  socket: any

  @State() tweetsQueue: any[] = []

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
  }

  componentDidLoad() {
    new mapboxgl.Map({
      container: this.mapElement,
      style: 'mapbox://styles/mapbox/streets-v9'
    })

    console.log(this.mapElement)
  }

  establishSocket() {
    this.socket = io(SOCKET_ENDPOINT)
    console.log(this.socket)
  }

  monitorEvents() {
    this.socket.on('connected', () => this.logger('Connection ACK'))

    this.socket.on('tweet', (element) => this.handleTweetEvent(element))
  }

  handleTweetEvent(element) {
    if (this.tweetsQueue.length >= 20)
      this.tweetsQueue.pop()

    this.tweetsQueue = [element, ...this.tweetsQueue]
  }

  logger(smth) {
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

import {Component, h} from '@stencil/core'
import io from 'socket.io-client'

import {SOCKET_ENDPOINT} from '../../conf'

@Component({
  tag: 'app-home',
  styleUrl: 'app-home.css',
  shadow: true
})
export class AppHome {
  socket: any

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
  }

  establishSocket() {
    this.socket = io(SOCKET_ENDPOINT)
    console.log(this.socket)
  }

  monitorEvents() {
    this.socket.on('connected', () => {
      console.log('Connection ACK')
    })

    this.socket.on('tweet', (element) => {
      console.log(element)
    })
  }

  render() {
    return (
      <div class='app-home'>
        Socket.io
      </div>
    )
  }
}

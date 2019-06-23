import {Component, h, State} from '@stencil/core'
import io from 'socket.io-client'

import {SOCKET_ENDPOINT} from '../../conf'

@Component({
  tag: 'app-home',
  styleUrl: 'app-home.css',
  shadow: true
})
export class AppHome {
  socket: any

  @State() tweetsQueue: any[] = []

  componentWillLoad() {
    this.establishSocket()
    this.monitorEvents()
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
        Socket.io

        {this.tweetsQueue.map((tweet: any) => (
          <div>
            {tweet.id}
          </div>
        ))}
      </div>
    )
  }
}

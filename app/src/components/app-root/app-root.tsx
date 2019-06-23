import {Component, h} from '@stencil/core'


@Component({
  tag: 'app-root',
  styleUrl: 'app-root.css',
  shadow: true
})
export class AppRoot {

  render() {
    return (
      <div>
        <main>
          <stencil-router>
            <stencil-route-switch scrollTopOffset={0}>
              <stencil-route url='/' component='app-home' exact={true}/>
            </stencil-route-switch>
          </stencil-router>
        </main>
      </div>
    )
  }
}

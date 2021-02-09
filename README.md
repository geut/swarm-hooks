# @geut/swarm-hooks

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

[![Made by GEUT][geut-badge]][geut-url]

[Discovery Swarm WebRTC](https://github.com/geut/discovery-swarm-webrtc) hooks for react.


## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Issues](#issues)
- [Contributing](#contributing)
- [License](#license)


## Install

```
$ npm install @geut/swarm-hooks
```
or
```
$ yarn add @geut/swarm-hooks
```

## Usage

```javascript
// ./App.js

import React from 'react'

import { SwarmProvider, Swarm } from '@geut/swarm-hooks'

import Peers from './components/Peers'

function App () {
  return (
    <SwarmProvider>  
      <Swarm id='cool-swarm' config={{ bootstrap: ['wss://geut-webrtc-signal-v3.herokuapp.com'] }}>
        <Peers />
      </Swarm>
    </SwarmProvider>
  )
}

export default App
```

```javascript
// ./components/Peers.js

import React, { useEffect } from 'react'
import crypto from 'crypto'

import { useJoin } from '@geut/swarm-hooks'

const someTopic = crypto.createHash('sha256')
    .update('some-topic')
    .digest()

function Peers () {
  const { peers, swarm } = useJoin({ id: 'cool-swarm', topic: someTopic })


  useEffect(() => {
    function onConnection (connection, info) {
      console.log('New peer!', connection, info)
    }
    
    function onConnectionClosed (connection, info) {
      console.log('Peer disconnected', connection, info)
    }

    swarm.on('connection', onConnection)
    swarm.on('connection-closed', onConnectionClosed)

    return () => {
      swarm.removeListener('connection', onConnection)
      swarm.removeListener('connection-closed', onConnectionClosed)
    }
  }, [])

  return (
    <div>
      <h1>Peers</h1>
      <ul>
        {peers.map(peer => <li>{peer.id.toString('hex')}</li>)}
      </ul>
    </div>
  )
}

export default Peers
```


## Api

### SwarmProvider
Keeps reference to multiple swarms based on his config.

#### children
`ReactElement` | _required_

React children.


### Swarm
Creates and provides an instance of [`discoverySwarmWebrtc`](https://github.com/geut/discovery-swarm-webrtc).

#### id
`string` | defaults to `'default'`

Identifies your swarm for access it later with [`useSwarm`](#useSwarm).

#### config
`object`

Object containing options as defined in [swarm creation](https://github.com/geut/discovery-swarm-webrtc#const-sw--swarmopts)

#### children
`ReactElement` | _required_

React children.


### useSwarm(options)
Hook to get the swarm instance defined by `id`

#### options
`object` | _required_

#### options.id
`string` | defaults to `'default'`

Identifies a `<Swarm />` previously created. `default` will be selected if no present.

#### options.replicator
`function`

Function executed on new connections. It allows to replicate an `hypercore` for example. See [`swarm.on('connection', function (connection, info)) { ... }`](https://github.com/geut/discovery-swarm-webrtc#swonconnection-functionconnection-info---) for usage.

#### Returns an `object` with:

#### `swarm`
[`discoverySwarmWebrtc`](https://github.com/geut/discovery-swarm-webrtc) instance.

### useJoin(options)
Hook to join into a particular topic

#### options
`object` | _required_

#### options.topic
`Buffer` | _required_

Topic to join.

#### options.id
`string` | defaults to `'default'`

Identifies a `<Swarm />` previously created. `default` will be selected if no present.

#### options.replicator
`function`

Function executed on new connections. It allows to replicate an `hypercore` for example. See [`swarm.on('connection', function (connection, info)) { ... }`](https://github.com/geut/discovery-swarm-webrtc#swonconnection-functionconnection-info---) for usage.

#### Returns an `object` with:

#### `swarm`
`DiscoverySwarmWebrtc`

[`discoverySwarmWebrtc`](https://github.com/geut/discovery-swarm-webrtc) instance.

#### `peers`
`array`

Array of connected peers. See [`getPeers`](https://github.com/geut/discovery-swarm-webrtc#const-arrayofpeers--swgetpeerschannel)


## Issues

:bug: If you found an issue we encourage you to report it on [github](https://github.com/geut/swarm-hooks/issues). Please specify your OS and the actions to reproduce it.


## Contributing

:busts_in_silhouette: Ideas and contributions to the project are welcome. You must follow this [guideline](https://github.com/geut/swarm-hooks/blob/main/CONTRIBUTING.md).


## License

MIT © A [**GEUT**](http://geutstudio.com/) project

[geut-url]: https://geutstudio.com
[geut-badge]: https://img.shields.io/badge/Made%20By-GEUT-4f5186?style=for-the-badge&link=https://geutstudio.com&labelColor=white&logo=data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCABAAEADASIAAhEBAxEB/8QAGwAAAgIDAQAAAAAAAAAAAAAABAYDBQACBwH/xAA0EAACAQMBBAcGBgMAAAAAAAABAgMABBEFBhIhQRMiMVFhgcEUIzJxkbFCUmKh0fAkcuH/xAAYAQADAQEAAAAAAAAAAAAAAAABAwQCAP/EACARAAMAAwACAgMAAAAAAAAAAAABAgMRIRIxBEEiM1H/2gAMAwEAAhEDEQA/AOgVlau6xoXdgqqMkk8AKV9U2oYs0WngBRw6VhxPyFamXXoDeiz1PUbmzuujQIUKgjIqGLXnz72FSO9TikfVbi6uXWSSaWRuzixNBx3VzCepNIvgTw+hpjwv+iGr3tM6xa30F2PdP1uangRRNc70fUbi4JLIVaPskXgM/wA076Ze+2W+WwJF4MPWlNaemajI2/GvYbWVlZQHCptZqLNKLGJsKoDSY5nkKorKzlvrlYIRlm5nsA7zWX8pnv55SfikJ/emPZGDcs7m6CguTuL5DPrVf64Me2F2mzNhAg6ZTO/MsSB9BW15s1pt1GVEPRHvQ+hqbTNT9sZ0kCpIOIA5ij5ZEijaSRgqqMkmpVkb7sMuWtoV73S49L3I4B7kjq57c881BZ6vFpuoKjq7dIvYBw8PtUOqX1xcSxoJXw8mQuewVW3vX1eFR+Fcn96OLVvpFzz8kM020kp4QwIvixzVpot5Je2bSTEFw5HAY7qUKadnIymm7x/G5I+3pTskzM8G4rqq6JGpI8E1wi8HR2H0NT7P6rcRKUEzYR9/czgEf0VabV2JgvhdKPdzdvg399aVG37K4Esfw/3hTU1S2NpNrSHqax9q/wAzTm3lY5KA4ZTQl2mo9CWljncL+cnA+tVVhqeSGt5mik5qDg/9o+XVb6aFonuDusMHqjP2qavjbfGTPX3xgTstrm4uGDSEYVV+woWPMKy3dzwd+JHcOQrdkgtyZpXJb87nJ8qqr68a7cKgIjB4DmadGNQjohs9i1C66Xqtvbx+EjIp10jaOMLBaPasDwRTGc5PyNJ1rb9EN5/jP7U17KaaZJvbpV6icI88z3+VG0vH8ipJJ8Ga8tIr22eCYZVh5g94pC1TTJtPmMU67yH4XxwYV0So54IriIxzRrIh7QwzSIyOTbWzlElkCcxtjwNedHeKMCVseDmnq72UgkJa1maL9LDeH81XvspfA9WSBh/sR6U9XD+zDQp+yTSNmR/MnJomG3SLiBlu80zQ7JXTH31xEg/Tlj6Vb2OzljaEO6meQc5OweVc8koOmUGjaFLfuss4MdsOOewv8v5p0ijSGNY41CoowAOQrbsr2p7t0zSWj//Z
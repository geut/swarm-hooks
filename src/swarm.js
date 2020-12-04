import React, { createContext, useContext, useEffect, useState } from 'react'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

const SwarmContext = createContext()

export function SwarmProvider ({ children, config = {}, handlers = {} }) {
  const swarm = discoverySwarmWebrtc(config)

  useEffect(() => {
    for (const event in handlers) {
      swarm.on(event, handlers[event])
    }

    return function () {
      for (const event in handlers) {
        swarm.removeListener(event, handlers[event])
      }
    }
  }, [])

  return (
    <SwarmContext.Provider value={{ swarm }}>
      {children}
    </SwarmContext.Provider>
  )
}

export function useJoin (topic, swarmConfig = {}) {
  const { swarm } = useSwarm(swarmConfig)
  const [peers, setPeers] = useState([])

  useEffect(() => {
    swarm.join(Buffer.from(topic, 'hex'))

    console.log('join')

    function connectionHandler (_, info) {
      if (info.channel.toString('hex') !== topic.toString('hex')) return

      console.log('peer', info.id.toString('hex'))
      setPeers(currentPeers => {
        console.log('1')
        if (currentPeers.find(peer => peer.id.toString('hex') === info.id.toString('hex'))) {
          return currentPeers
        }
        console.log('2')

        return swarm.getPeers(Buffer.from(topic, 'hex'))
      })
    }

    // function connectionCloseHandler (_, info) {
    //   if (info.channel.toString('hex') !== topic.toString('hex')) return

    //   console.log('peer-close', info.id.toString('hex'))
    //   const peers = swarm.getPeers(Buffer.from(topic, 'hex'))
    //   setPeers(peers)
    // }

    swarm.on('connection', connectionHandler)
    swarm.on('connection-closed', connectionHandler)

    return function leave () {
      swarm.removeListener('connection', connectionHandler)
      swarm.removeListener('connection-closed', connectionHandler)

      swarm.leave(Buffer.from(topic, 'hex'))
    }
  }, [topic.toString('hex')])

  return { swarm, peers }
}

export function useSwarm ({ replicator } = {}) {
  const { swarm } = useContext(SwarmContext)

  useEffect(() => {
    if (!replicator) return

    swarm.on('connection', replicator)

    return function () {
      swarm.removeListener('connection', replicator)
    }
  }, [replicator])

  return { swarm }
}

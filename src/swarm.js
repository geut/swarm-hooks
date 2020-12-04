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
    swarm.join(topic)

    function connectionHandler (_, info) {
      if (info.channel.toString('hex') !== topic.toString('hex')) return

      setPeers(swarm.getPeers(Buffer.from(topic, 'hex')))
    }

    swarm.on('connection', connectionHandler)
    swarm.on('connection-closed', connectionHandler)

    return function leave () {
      swarm.removeListener('connection', connectionHandler)
      swarm.removeListener('connection-closed', connectionHandler)

      swarm.leave(topic)
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

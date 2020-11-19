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

export function useJoin (topic) {
  const { swarm } = useContext(SwarmContext)
  const [peers, setPeers] = useState({})

  useEffect(() => {
    swarm.join(Buffer.from(topic, 'hex'))

    swarm.on('connection', connectionHandler)
    swarm.on('connection-close', connectionCloseHandler)

    return function leave () {
      swarm.removeListener('connection', connectionHandler)
      swarm.removeListener('connection-close', connectionCloseHandler)

      swarm.leave(Buffer.from(topic, 'hex'))
    }
  }, [topic])

  function connectionHandler (peer) {
    setPeers(peers => ({ ...peers, [peer._id]: peer }))
  }

  function connectionCloseHandler (peer) {
    setPeers(peers => {
      const newPeers = { ...peers }
      delete newPeers[peer._id]
      return newPeers
    })
  }

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

import { useContext, useEffect, useState, useCallback } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

import { SwarmContext } from './swarm-provider'

export function Swarm ({ id = 'default', config = {}, children }) {
  const [swarm, setSwarm] = useState()
  const { swarms } = useContext(SwarmContext)

  useDeepCompareEffect(() => {
    const swarmRef = swarms.get(id) || {
      protocolHandlerByTopic: new Map(),
      defaultProtocolHandler: null,
      events: new Set()
    }

    const swarm = swarmRef.swarm = discoverySwarmWebrtc(config)

    function onConnection (conn, info) {
      const { protocolHandlerByTopic, defaultProtocolHandler, events } = swarmRef

      const onConnectionEvents = Array.from(events.values()).filter(event => event.name === 'connection' && (!event.topic || event.topic.equals(info.channel)))
      const protocolHandler = protocolHandlerByTopic.get(info.channel.toString('hex')) || defaultProtocolHandler

      if (!protocolHandler) return emit(conn, info)

      const protocol = protocolHandler(conn, info)
      if (!protocol) return emit(conn, info)

      conn.protocol = protocol
      protocol.once('handshake', () => {
        emit(conn, info)
      })

      function emit (conn, info) {
        onConnectionEvents.forEach(event => {
          event.callback(conn, info)
        })
      }
    }

    function onDisconnection (conn, info) {
      const { events } = swarmRef

      const onDisconnectionEvents = Array.from(events.values()).filter(event => event.name === 'connection-closed' && (!event.topic || event.topic.equals(info.channel)))
      onDisconnectionEvents.forEach(event => {
        event.callback(conn, info)
      })
    }

    swarm.on('connection', onConnection)
    swarm.on('connection-closed', onDisconnection)

    swarms.set(id, swarmRef)
    setSwarm(swarm)

    return function close () {
      swarm.removeListener('connection', onConnection)
      swarm.removeListener('connection-closed', onDisconnection)
      swarm.close().catch(() => {})
    }
  }, [config])

  return (swarm ? children : null)
}

function swarmSubscription (swarmRef, topic) {
  return function useSubscription (name, handler, deps = []) {
    useEffect(() => {
      const { events } = swarmRef

      const event = {
        name,
        callback (conn, info) {
          handler(conn, info)
        },
        topic
      }

      events.add(event)
      return () => {
        events.delete(event)
      }
    }, [topic?.toString('hex'), name, ...deps])
  }
}

export function useJoin ({ topic, id, join = true }) {
  const { swarms } = useContext(SwarmContext)

  const swarmRef = swarms.get(id)

  const [peers, setPeers] = useState([])

  const useSubscription = swarmSubscription(swarmRef, topic)

  useEffect(() => {
    if (join) {
      swarmRef.swarm.join(topic)
    }

    return function leave () {
      swarmRef.swarm.leave(topic).catch(() => {})
    }
  }, [join, topic.toString('hex')])

  const useHypercoreProtocol = (handler, deps = []) => {
    useEffect(() => {
      swarmRef.protocolHandlerByTopic.set(topic.toString('hex'), handler)
      return () => {
        swarmRef.protocolHandlerByTopic.delete(topic.toString('hex'))
      }
    }, [topic.toString('hex'), ...deps])
  }

  useSubscription('connection', () => {
    setPeers(swarmRef.swarm.getPeers(topic))
  })

  useSubscription('connection-closed', () => {
    setPeers(swarmRef.swarm.getPeers(topic))
  })

  const joinHandler = useCallback(() => {
    swarmRef.swarm.join(topic)
  }, [topic.toString('hex')])

  const leaveHandler = useCallback(() => {
    swarmRef.swarm.leave(topic)
  }, [topic.toString('hex')])

  return { swarm: swarmRef.swarm, peers, useSubscription, useHypercoreProtocol, join: joinHandler, leave: leaveHandler }
}

export function useSwarm ({ id = 'default' } = {}) {
  const { swarms } = useContext(SwarmContext)

  const swarmRef = swarms.get(id)

  const [peers, setPeers] = useState([])

  const useSubscription = swarmSubscription(swarmRef)

  const useHypercoreProtocol = (handler, deps = []) => {
    useEffect(() => {
      swarmRef.defaultProtocolHandler = handler
      return () => {
        swarmRef.defaultProtocolHandler = null
      }
    }, deps)
  }

  useSubscription('connection', () => {
    setPeers(swarmRef.swarm.getPeers())
  })

  useSubscription('connection-closed', () => {
    setPeers(swarmRef.swarm.getPeers())
  })

  return { swarm: swarmRef.swarm, peers, useSubscription, useHypercoreProtocol }
}

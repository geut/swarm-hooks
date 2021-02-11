import { useContext, useEffect, useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

import { SwarmContext } from './swarm-provider'

export function Swarm ({ id = 'default', config = {}, children }) {
  const [swarm, setSwarm] = useState()
  const { swarms } = useContext(SwarmContext)

  useDeepCompareEffect(() => {
    const ref = swarms.get(id) || {
      onPeers: new Set(),
      defaultHandlers: {},
      handlersByTopic: {
        connection: new Map(),
        'connection-closed': new Map(),
        'pre-connection': new Map()
      }
    }

    const swarm = discoverySwarmWebrtc(config)

    function onConnection (conn, info) {
      const { onPeers, defaultHandlers, handlersByTopic } = ref

      const topicStr = info.channel.toString('hex')
      const preConnection = handlersByTopic['pre-connection'].get(topicStr) || defaultHandlers['pre-connection']

      if (!preConnection) return done(conn, info)

      const protocol = preConnection(conn, info)
      if (!protocol) return done(conn, info)

      conn.protocol = protocol
      protocol.once('handshake', () => {
        done(conn, info)
      })

      function done (conn, info) {
        const onConnection = handlersByTopic.connection.get(topicStr)
        onConnection && onConnection(conn, info)
        defaultHandlers.connection && defaultHandlers.connection(conn, info)
        onPeers.forEach(handler => handler(conn, info))
      }
    }

    function onDisconnection (conn, info) {
      const { defaultHandlers, handlersByTopic } = ref

      const onConnectionClosed = handlersByTopic['connection-closed'].get(info.channel.toString('hex'))
      onConnectionClosed && onConnectionClosed(conn, info)
      defaultHandlers['connection-closed'] && defaultHandlers['connection-closed'](conn, info)
    }

    swarm.on('connection', onConnection)
    swarm.on('connection-closed', onDisconnection)

    ref.swarm = swarm
    swarms.set(id, ref)
    setSwarm(swarm)

    return function close () {
      swarm.removeListener('connection', onConnection)
      swarm.removeListener('connection-closed', onDisconnection)
      swarm.close().catch(() => {})
    }
  }, [config])

  return (swarm ? children : null)
}

export function useJoin ({ topic, id, condition = true }) {
  const { swarms } = useContext(SwarmContext)

  const ref = swarms.get(id)

  const [peers, setPeers] = useState([])

  const topicStr = topic.toString('hex')

  useEffect(() => {
    if (!ref || !condition) return

    const { swarm } = ref

    swarm.join(topic)
    return function leave () {
      swarm.leave(topic).catch(() => {})
    }
  }, [ref, topicStr, condition])

  const useSubscription = (eventName, handler, deps = []) => useEffect(() => {
    if (!ref || !handler) return

    const handlers = ref.handlersByTopic[eventName]
    handlers.set(topicStr, (conn, info) => handler(conn, info))
    return () => {
      handlers.delete(topicStr)
    }
  }, [ref, ...deps])

  useEffect(() => {
    if (!ref) return
    const { onPeers, swarm } = ref
    const handler = () => setPeers(swarm.getPeers(topic))
    onPeers.add(handler)
    return () => onPeers.delete(handler)
  }, [ref, topicStr])

  return { swarm: ref && ref.swarm, peers, useSubscription }
}

export function useSwarm ({ id = 'default' } = {}) {
  const { swarms } = useContext(SwarmContext)

  const ref = swarms.get(id)

  const [peers, setPeers] = useState([])

  const useSubscription = (eventName, handler, deps = []) => useEffect(() => {
    if (!ref || !handler) return

    const handlers = ref.defaultHandlers
    handlers[eventName] = (conn, info) => handler(conn, info)
    return () => {
      handlers[eventName] = null
    }
  }, [ref, eventName, ...deps])

  useEffect(() => {
    if (!ref) return
    const { onPeers, swarm } = ref
    const handler = () => setPeers(swarm.getPeers())
    onPeers.add(handler)
    return () => onPeers.delete(handler)
  }, [ref])

  return { swarm: ref && ref.swarm, peers, useSubscription }
}

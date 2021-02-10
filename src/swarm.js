import { useContext, useEffect, useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

import { SwarmContext } from './swarm-provider'

export function Swarm ({ id = 'default', config = {}, children }) {
  const [swarm, setSwarm] = useState()
  const { swarms } = useContext(SwarmContext)

  useDeepCompareEffect(() => {
    const ref = swarms.get(id) || {
      defaultReplicator: null,
      topicHandlers: new Map(),
      topicReplicators: new Map()
    }

    const swarm = discoverySwarmWebrtc(config)

    function onConnection (conn, info) {
      const topicStr = info.channel.toString('hex')
      const replicatorHanlder = ref.topicReplicators.get(topicStr) || ref.defaultReplicator
      const handler = ref.topicHandlers.get(info.channel.toString('hex'))

      if (!replicatorHanlder) {
        return handler && handler('connection', conn, info)
      }

      const protocol = replicatorHanlder(conn, info)
      if (!protocol) {
        return handler && handler('connection', conn, info)
      }

      protocol.once('handshake', () => {
        handler && handler('connection', conn, info, protocol)
      })
    }

    function onDisconnection (conn, info) {
      const handler = ref.topicHandlers.get(info.channel.toString('hex'))
      handler && handler('disconnection', conn, info)
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

export function useJoin ({ topic, id, replicator, onConnection, onDisconnection }) {
  const { swarms } = useContext(SwarmContext)
  const ref = swarms.get(id)

  const [peers, setPeers] = useState([])

  const topicStr = topic.toString('hex')

  useEffect(() => {
    if (!ref) return

    const { swarm, topicHandlers, topicReplicators } = ref

    swarm.join(topic)

    return function leave () {
      swarm.leave(topic).catch(() => {})
      topicHandlers.delete(topic.toString('hex'))
      topicReplicators.delete(topic.toString('hex'))
    }
  }, [ref, topicStr, ref.swarm])

  useEffect(() => {
    if (!ref) return

    const { swarm, topicHandlers } = ref

    topicHandlers.set(topicStr, (type, conn, info) => {
      if (type === 'connection') {
        onConnection && onConnection(conn, info)
      } else {
        onDisconnection && onDisconnection(conn, info)
      }
      setPeers(swarm.getPeers(topic))
    })

    return () => {
      topicHandlers.delete(topicStr)
    }
  }, [ref, topicStr, onConnection, onDisconnection])

  useEffect(() => {
    if (!ref) return

    const { topicReplicators } = ref

    topicReplicators.set(topicStr, (conn, info) => replicator(conn, info))
    return () => {
      topicReplicators.delete(topicStr)
    }
  }, [ref, topicStr, replicator])

  return { peers, swarm: ref && ref.swarm }
}

export function useSwarm ({ id = 'default', replicator } = {}) {
  const { swarms } = useContext(SwarmContext)

  const ref = swarms.get(id)

  useEffect(() => {
    if (!ref) return

    ref.defaultReplicator = replicator
    return () => {
      ref.defaultReplicator = null
    }
  }, [ref, replicator])

  return { swarm: ref && ref.swarm }
}

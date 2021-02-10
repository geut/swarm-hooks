import { useContext, useEffect, useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

import { SwarmContext } from './swarm-provider'

export function Swarm ({ id = 'default', config = {}, children }) {
  const [swarm, setSwarm] = useState()
  const { swarms } = useContext(SwarmContext)

  useDeepCompareEffect(() => {
    const ref = swarms.get(id) || {
      defaultReplicate: null,
      handlersByTopic: new Map(),
      replicatesByTopic: new Map()
    }

    const swarm = discoverySwarmWebrtc(config)

    function onConnection (conn, info) {
      const topicStr = info.channel.toString('hex')
      const handler = ref.handlersByTopic.get(info.channel.toString('hex'))
      const replicateHanlder = ref.replicatesByTopic.get(topicStr) || ref.defaultReplicate

      if (!replicateHanlder) {
        return handler && handler('connection', conn, info)
      }

      const protocol = replicateHanlder(conn, info)
      if (!protocol) {
        return handler && handler('connection', conn, info)
      }

      conn.protocol = protocol
      protocol.once('handshake', () => {
        handler && handler('connection', conn, info)
      })
    }

    function onDisconnection (conn, info) {
      const handler = ref.handlersByTopic.get(info.channel.toString('hex'))
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

export function useJoin ({ topic, id, replicate, onConnection, onDisconnection }) {
  const { swarms } = useContext(SwarmContext)
  const ref = swarms.get(id)

  const [peers, setPeers] = useState([])

  const topicStr = topic.toString('hex')

  useEffect(() => {
    if (!ref) return

    const { swarm } = ref

    swarm.join(topic)

    return function leave () {
      swarm.leave(topic).catch(() => {})
    }
  }, [ref, topicStr, ref.swarm])

  useEffect(() => {
    if (!ref) return

    const { swarm, handlersByTopic } = ref

    handlersByTopic.set(topicStr, (type, conn, info) => {
      if (type === 'connection') {
        onConnection && onConnection(conn, info)
      } else {
        onDisconnection && onDisconnection(conn, info)
      }
      setPeers(swarm.getPeers(topic))
    })

    return () => {
      handlersByTopic.delete(topicStr)
    }
  }, [ref, topicStr, onConnection, onDisconnection])

  useEffect(() => {
    if (!ref || !replicate) return

    const { replicatesByTopic } = ref

    replicatesByTopic.set(topicStr, (conn, info) => replicate(conn, info))
    return () => {
      replicatesByTopic.delete(topicStr)
    }
  }, [ref, topicStr, replicate])

  return { peers, swarm: ref && ref.swarm }
}

export function useSwarm ({ id = 'default', replicate } = {}) {
  const { swarms } = useContext(SwarmContext)

  const ref = swarms.get(id)

  useEffect(() => {
    if (!ref) return

    ref.defaultReplicate = replicate
    return () => {
      ref.defaultReplicate = null
    }
  }, [ref, replicate])

  return { swarm: ref && ref.swarm }
}

import { useContext, useEffect, useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

import { SwarmContext } from './swarm-provider'

export function Swarm ({ id = 'default', config = {}, children }) {
  const [swarm, setSwarm] = useState()
  const { swarms } = useContext(SwarmContext)

  useDeepCompareEffect(() => {
    const ref = swarms.get(id) || {
      topicHandlers: new Map(),
      topicReplicate: new Map()
    }

    const swarm = discoverySwarmWebrtc({
      ...config,
      stream: (info) => {
        const replicate = ref.topicReplicate.get(info.channel.toString('hex'))
        if (replicate) return replicate(info)
        return config.stream && config.stream(info)
      }
    })

    function onConnection (conn, info) {
      const handler = ref.topicHandlers.get(info.channel.toString('hex'))
      handler && handler('connection', conn, info)
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
      swarm.close().catch(err => {
        console.error(err)
      })
    }
  }, [config])

  return (swarm ? children : null)
}

export function useJoin ({ topic, id, replicate, onConnection, onDisconnection }) {
  const { swarms } = useContext(SwarmContext)
  const ref = swarms.get(id) || {}

  const [peers, setPeers] = useState([])

  const topicStr = topic.toString('hex')

  useEffect(() => {
    const { swarm } = ref
    if (!swarm) return

    swarm.join(topic)

    return function leave () {
      swarm.leave(topic)
    }
  }, [topicStr, ref.swarm])

  useEffect(() => {
    const { swarm, topicHandlers } = ref
    if (!swarm || !topicHandlers) return

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
  }, [topicStr, onConnection, onDisconnection])

  useEffect(() => {
    const { swarm, topicReplicate } = ref
    if (!swarm || !topicReplicate) return

    topicReplicate.set(topicStr, info => replicate(info))

    return () => {
      topicReplicate.delete(topicStr)
    }
  }, [topicStr, replicate])

  return { peers, swarm: ref.swarm }
}

export function useSwarm ({ id = 'default' } = {}) {
  const { swarms } = useContext(SwarmContext)

  const ref = swarms.get(id)
  if (!ref) return { swarm: undefined }

  return { swarm: ref.swarm }
}

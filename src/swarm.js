import { useContext, useEffect, useState } from 'react'
import useDeepCompareEffect from 'use-deep-compare-effect'

import discoverySwarmWebrtc from '@geut/discovery-swarm-webrtc'

import { SwarmContext } from './swarm-provider'

export function Swarm ({ id = 'default', config = {}, children }) {
  const [swarm, setSwarm] = useState()
  const { swarms } = useContext(SwarmContext)

  useDeepCompareEffect(() => {
    const swarm = discoverySwarmWebrtc(config)
    swarms.set(id, swarm)
    setSwarm(swarm)
  }, [config])

  return (swarm ? children : null)
}

export function useJoin ({ topic, id, replicator }) {
  const { swarm } = useSwarm({ id, replicator })
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

export function useSwarm ({ id = 'default', replicator } = {}) {
  const { swarms } = useContext(SwarmContext)

  const swarm = swarms.get(id)

  useEffect(() => {
    if (!replicator) return

    swarm.on('connection', replicator)

    return function () {
      swarm.removeListener('connection', replicator)
    }
  }, [id, replicator])

  return { swarm }
}

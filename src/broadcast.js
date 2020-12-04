import { useCallback, useEffect, useState } from 'react'

import { decode, encode } from 'buffer-json-encoding'

export function useBroadcast (swarm, { topic } = {}) {
  const [message, setMessage] = useState()
  const [lastData, setLastData] = useState()
  const [lastPeer, setLastPeer] = useState()

  useEffect(() => {
    if (!lastData || !lastPeer) return

    lastPeer.send(encode(lastData))
  }, [lastData, lastPeer])

  useEffect(() => {
    function messageHandler (message) {
      setMessage(decode(message))
    }

    function connectionHandler (peer) {
      setLastPeer(peer)
      peer.on('data', messageHandler)
    }

    function connectionClosedHandler (peer) {
      peer.removeListener('data', messageHandler)
    }

    swarm.on('connection', connectionHandler)
    swarm.on('connection-closed', connectionClosedHandler)

    return function () {
      swarm.removeListener('connection', connectionHandler)
      swarm.removeListener('connection-closed', connectionClosedHandler)
    }
  }, [swarm])

  const sendMessage = useCallback(function sendMessage (data) {
    setLastData(data)
    swarm.getPeers(topic).forEach(({ stream }) => {
      stream.send(encode(data))
    })
  }, [swarm, topic])

  return [message, sendMessage]
}

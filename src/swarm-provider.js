import React, { createContext } from 'react'

export const SwarmContext = createContext()

export function SwarmProvider ({ children }) {
  const swarms = new Map()

  return (
    <SwarmContext.Provider value={{ swarms }}>
      {children}
    </SwarmContext.Provider>
  )
}

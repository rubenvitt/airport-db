import React, { createContext, useContext, type ReactNode } from 'react'
import { useFlightWebSocket, type UseFlightWebSocketReturn, type UseFlightWebSocketOptions } from '@/hooks/useFlightWebSocket'

interface FlightWebSocketProviderProps {
  children: ReactNode
  options?: UseFlightWebSocketOptions
}

const FlightWebSocketContext = createContext<UseFlightWebSocketReturn | null>(null)

export function FlightWebSocketProvider({ children, options }: FlightWebSocketProviderProps) {
  const websocket = useFlightWebSocket(options)

  return (
    <FlightWebSocketContext.Provider value={websocket}>
      {children}
    </FlightWebSocketContext.Provider>
  )
}

export function useFlightWebSocketContext(): UseFlightWebSocketReturn {
  const context = useContext(FlightWebSocketContext)
  
  if (!context) {
    throw new Error('useFlightWebSocketContext must be used within a FlightWebSocketProvider')
  }
  
  return context
}

export { type UseFlightWebSocketReturn }
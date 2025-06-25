import { useCallback, useEffect, useRef, useState } from 'react'
import type { FlightState, FlightsResponse } from '@/types/flight'
import { FlightWebSocketClient, type FlightWebSocketCallbacks } from '@/services/websocket/FlightWebSocketClient'

export interface UseFlightWebSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface UseFlightWebSocketReturn {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionError: Error | null
  
  // Connection control
  connect: () => void
  disconnect: () => void
  
  // Subscription methods
  subscribeToFlight: (icao24: string) => void
  unsubscribeFromFlight: (icao24: string) => void
  subscribeToArea: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => void
  
  // Data
  lastFlightUpdate: FlightState | null
  lastBulkUpdate: FlightsResponse | null
  
  // Event handlers
  onFlightUpdate: (callback: (flight: FlightState) => void) => () => void
  onBulkUpdate: (callback: (flights: FlightsResponse) => void) => () => void
}

export function useFlightWebSocket(options: UseFlightWebSocketOptions = {}): UseFlightWebSocketReturn {
  const {
    url = process.env.NODE_ENV === 'development' 
      ? 'ws://localhost:3001/ws/flights' 
      : 'wss://api.yoursite.com/ws/flights',
    autoConnect = false,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30000,
  } = options

  // State
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<Error | null>(null)
  const [lastFlightUpdate, setLastFlightUpdate] = useState<FlightState | null>(null)
  const [lastBulkUpdate, setLastBulkUpdate] = useState<FlightsResponse | null>(null)

  // Refs for callbacks
  const clientRef = useRef<FlightWebSocketClient | null>(null)
  const flightUpdateCallbacksRef = useRef<Set<(flight: FlightState) => void>>(new Set())
  const bulkUpdateCallbacksRef = useRef<Set<(flights: FlightsResponse) => void>>(new Set())

  // Initialize WebSocket client
  useEffect(() => {
    const callbacks: FlightWebSocketCallbacks = {
      onFlightUpdate: (flight: FlightState) => {
        setLastFlightUpdate(flight)
        flightUpdateCallbacksRef.current.forEach(callback => callback(flight))
      },
      onBulkUpdate: (flights: FlightsResponse) => {
        setLastBulkUpdate(flights)
        bulkUpdateCallbacksRef.current.forEach(callback => callback(flights))
      },
      onConnectionChange: (connected: boolean) => {
        setIsConnected(connected)
        setIsConnecting(false)
        if (connected) {
          setConnectionError(null)
        }
      },
      onError: (error: Error) => {
        setConnectionError(error)
        setIsConnecting(false)
      },
    }

    clientRef.current = new FlightWebSocketClient(
      {
        url,
        reconnectInterval,
        maxReconnectAttempts,
        heartbeatInterval,
      },
      callbacks
    )

    // Auto-connect if enabled
    if (autoConnect) {
      clientRef.current.connect()
      setIsConnecting(true)
    }

    // Cleanup on unmount
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect()
        clientRef.current = null
      }
    }
  }, [url, autoConnect, reconnectInterval, maxReconnectAttempts, heartbeatInterval])

  // Connection control methods
  const connect = useCallback(() => {
    if (clientRef.current && !isConnected && !isConnecting) {
      setIsConnecting(true)
      setConnectionError(null)
      clientRef.current.connect()
    }
  }, [isConnected, isConnecting])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      setIsConnecting(false)
    }
  }, [])

  // Subscription methods
  const subscribeToFlight = useCallback((icao24: string) => {
    if (clientRef.current && isConnected) {
      clientRef.current.subscribeToFlight(icao24)
    }
  }, [isConnected])

  const unsubscribeFromFlight = useCallback((icao24: string) => {
    if (clientRef.current && isConnected) {
      clientRef.current.unsubscribeFromFlight(icao24)
    }
  }, [isConnected])

  const subscribeToArea = useCallback((bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) => {
    if (clientRef.current && isConnected) {
      clientRef.current.subscribeToArea(bounds)
    }
  }, [isConnected])

  // Event handler registration
  const onFlightUpdate = useCallback((callback: (flight: FlightState) => void) => {
    flightUpdateCallbacksRef.current.add(callback)
    
    // Return unsubscribe function
    return () => {
      flightUpdateCallbacksRef.current.delete(callback)
    }
  }, [])

  const onBulkUpdate = useCallback((callback: (flights: FlightsResponse) => void) => {
    bulkUpdateCallbacksRef.current.add(callback)
    
    // Return unsubscribe function
    return () => {
      bulkUpdateCallbacksRef.current.delete(callback)
    }
  }, [])

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionError,
    
    // Connection control
    connect,
    disconnect,
    
    // Subscription methods
    subscribeToFlight,
    unsubscribeFromFlight,
    subscribeToArea,
    
    // Data
    lastFlightUpdate,
    lastBulkUpdate,
    
    // Event handlers
    onFlightUpdate,
    onBulkUpdate,
  }
}
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FlightState, FlightTrack } from '@/types/flight'
import { FlightDataStore, type FlightBounds, type FlightQueryOptions, type FlightStorageMetrics, type FlightUpdate } from '@/stores/FlightDataStore'
import { useFlightWebSocketContext } from '@/contexts/FlightWebSocketContext'
import { flightsServerApi } from '@/api/flights-server'

export interface UseFlightDataOptions {
  autoSubscribeToUpdates?: boolean
  staleThreshold?: number
  maxFlights?: number
  spatialGridSize?: number
}

export interface UseFlightDataReturn {
  // Data queries
  getFlight: (icao24: string) => FlightState | null
  queryFlights: (options?: FlightQueryOptions) => FlightState[]
  getFlightsNearPoint: (lat: number, lon: number, radiusKm: number) => FlightState[]
  getAllFlights: () => FlightState[]
  
  // Track queries
  getFlightTrack: (icao24: string) => FlightTrack | null
  hasFlightTrack: (icao24: string) => boolean
  getAllTracks: () => Map<string, FlightTrack>
  
  // Store management
  updateFlight: (flight: FlightState) => FlightUpdate
  bulkUpdate: (flights: FlightState[]) => FlightUpdate[]
  removeFlight: (icao24: string) => boolean
  clear: () => void
  
  // Track management
  setFlightTrack: (icao24: string, track: FlightTrack) => void
  removeFlightTrack: (icao24: string) => boolean
  
  // Metrics and state
  metrics: FlightStorageMetrics
  flightCount: number
  lastUpdate: number
  
  // Real-time updates
  isReceivingUpdates: boolean
  updateRate: number
  
  // Event handlers
  onFlightUpdate: (callback: (update: FlightUpdate) => void) => () => void
  onBulkUpdate: (callback: (updates: FlightUpdate[]) => void) => () => void
}

export function useFlightData(options: UseFlightDataOptions = {}): UseFlightDataReturn {
  const {
    autoSubscribeToUpdates = true,
    staleThreshold = 300000, // 5 minutes
    maxFlights = 50000,
    spatialGridSize = 1,
  } = options

  // Initialize store
  const storeRef = useRef<FlightDataStore>(
    new FlightDataStore({ staleThreshold, maxFlights, spatialGridSize })
  )

  // State
  const [metrics, setMetrics] = useState<FlightStorageMetrics>(() => storeRef.current.getMetrics())
  const [flightCount, setFlightCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const [isReceivingUpdates, setIsReceivingUpdates] = useState(false)
  const [updateRate, setUpdateRate] = useState(0)

  // Refs for callbacks
  const flightUpdateCallbacksRef = useRef<Set<(update: FlightUpdate) => void>>(new Set())
  const bulkUpdateCallbacksRef = useRef<Set<(updates: FlightUpdate[]) => void>>(new Set())
  const updateCountRef = useRef(0)
  const lastRateCalcRef = useRef(Date.now())

  // WebSocket integration
  const webSocket = useFlightWebSocketContext()

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics = storeRef.current.getMetrics()
      setMetrics(newMetrics)
      setFlightCount(storeRef.current.getFlightCount())
      
      // Calculate update rate
      const now = Date.now()
      const timeDiff = now - lastRateCalcRef.current
      if (timeDiff >= 5000) { // Every 5 seconds
        const rate = (updateCountRef.current / timeDiff) * 1000 // Updates per second
        setUpdateRate(rate)
        updateCountRef.current = 0
        lastRateCalcRef.current = now
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Handle WebSocket flight updates
  useEffect(() => {
    if (!autoSubscribeToUpdates) return

    const unsubscribeFlightUpdate = webSocket.onFlightUpdate((flight: FlightState) => {
      const update = storeRef.current.updateFlight(flight)
      setLastUpdate(Date.now())
      setIsReceivingUpdates(true)
      updateCountRef.current++
      
      // Notify callbacks
      flightUpdateCallbacksRef.current.forEach(callback => callback(update))
    })

    const unsubscribeBulkUpdate = webSocket.onBulkUpdate((response) => {
      const updates = storeRef.current.bulkUpdate(response.states)
      setLastUpdate(Date.now())
      setIsReceivingUpdates(true)
      updateCountRef.current += updates.length
      
      // Notify callbacks
      bulkUpdateCallbacksRef.current.forEach(callback => callback(updates))
    })

    return () => {
      unsubscribeFlightUpdate()
      unsubscribeBulkUpdate()
    }
  }, [webSocket, autoSubscribeToUpdates])

  // Stop "receiving updates" indicator after period of inactivity
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsReceivingUpdates(false)
    }, 10000) // 10 seconds

    return () => clearTimeout(timeout)
  }, [lastUpdate])

  // Store methods
  const getFlight = useCallback((icao24: string) => {
    return storeRef.current.getFlight(icao24)
  }, [])

  const queryFlights = useCallback((queryOptions?: FlightQueryOptions) => {
    return storeRef.current.queryFlights(queryOptions)
  }, [])

  const getFlightsNearPoint = useCallback((lat: number, lon: number, radiusKm: number) => {
    return storeRef.current.getFlightsNearPoint(lat, lon, radiusKm)
  }, [])

  const getAllFlights = useCallback(() => {
    return storeRef.current.getAllFlights()
  }, [])

  // Track query methods
  const getFlightTrack = useCallback((icao24: string) => {
    return storeRef.current.getFlightTrack(icao24)
  }, [])

  const hasFlightTrack = useCallback((icao24: string) => {
    return storeRef.current.hasFlightTrack(icao24)
  }, [])

  const getAllTracks = useCallback(() => {
    return storeRef.current.getAllTracks()
  }, [])

  // Track management methods
  const setFlightTrack = useCallback((icao24: string, track: FlightTrack) => {
    storeRef.current.setFlightTrack(icao24, track)
    setLastUpdate(Date.now())
  }, [])

  const removeFlightTrack = useCallback((icao24: string) => {
    const result = storeRef.current.removeFlightTrack(icao24)
    if (result) {
      setLastUpdate(Date.now())
    }
    return result
  }, [])

  const updateFlight = useCallback((flight: FlightState) => {
    const update = storeRef.current.updateFlight(flight)
    setLastUpdate(Date.now())
    updateCountRef.current++
    
    // Notify callbacks
    flightUpdateCallbacksRef.current.forEach(callback => callback(update))
    
    return update
  }, [])

  const bulkUpdate = useCallback((flights: FlightState[]) => {
    const updates = storeRef.current.bulkUpdate(flights)
    setLastUpdate(Date.now())
    updateCountRef.current += updates.length
    
    // Notify callbacks
    bulkUpdateCallbacksRef.current.forEach(callback => callback(updates))
    
    return updates
  }, [])

  const removeFlight = useCallback((icao24: string) => {
    const result = storeRef.current.removeFlight(icao24)
    if (result) {
      setLastUpdate(Date.now())
    }
    return result
  }, [])

  const clear = useCallback(() => {
    storeRef.current.clear()
    setLastUpdate(Date.now())
    setMetrics(storeRef.current.getMetrics())
    setFlightCount(0)
    setUpdateRate(0)
    updateCountRef.current = 0
  }, [])

  // Event handler registration
  const onFlightUpdate = useCallback((callback: (update: FlightUpdate) => void) => {
    flightUpdateCallbacksRef.current.add(callback)
    
    return () => {
      flightUpdateCallbacksRef.current.delete(callback)
    }
  }, [])

  const onBulkUpdate = useCallback((callback: (updates: FlightUpdate[]) => void) => {
    bulkUpdateCallbacksRef.current.add(callback)
    
    return () => {
      bulkUpdateCallbacksRef.current.delete(callback)
    }
  }, [])

  return {
    // Data queries
    getFlight,
    queryFlights,
    getFlightsNearPoint,
    getAllFlights,
    
    // Track queries
    getFlightTrack,
    hasFlightTrack,
    getAllTracks,
    
    // Store management
    updateFlight,
    bulkUpdate,
    removeFlight,
    clear,
    
    // Track management
    setFlightTrack,
    removeFlightTrack,
    
    // Metrics and state
    metrics,
    flightCount,
    lastUpdate,
    
    // Real-time updates
    isReceivingUpdates,
    updateRate,
    
    // Event handlers
    onFlightUpdate,
    onBulkUpdate,
  }
}
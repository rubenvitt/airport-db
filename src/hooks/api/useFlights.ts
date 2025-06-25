import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type { DepartureArrival, FlightsResponse } from '@/types/flight'
import { flightsFetchApi } from '@/api/flights-fetch'

// Query keys factory
export const flightKeys = {
  all: ['flights'] as const,
  states: () => [...flightKeys.all, 'states'] as const,
  statesByBounds: (bounds: { lamin: number; lomin: number; lamax: number; lomax: number }) =>
    [...flightKeys.states(), bounds] as const,
  statesNearLocation: (lat: number, lon: number, radius: number) =>
    [...flightKeys.states(), { lat, lon, radius }] as const,
  track: (icao24: string, time?: number) =>
    [...flightKeys.all, 'track', icao24, time] as const,
  byAircraft: (icao24: string, begin: number, end: number) =>
    [...flightKeys.all, 'aircraft', icao24, { begin, end }] as const,
  arrivals: (airport: string, begin: number, end: number) =>
    [...flightKeys.all, 'arrivals', airport, { begin, end }] as const,
  departures: (airport: string, begin: number, end: number) =>
    [...flightKeys.all, 'departures', airport, { begin, end }] as const,
}

// Hook to get all current flight states
export function useAllFlightStates(options?: {
  enabled?: boolean
  refetchInterval?: number
}) {
  return useQuery({
    queryKey: flightKeys.states(),
    queryFn: async () => {
      const response = await flightsFetchApi.getAllStates()
      return response.flights
    },
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 1000, // 30 seconds
    refetchInterval: options?.refetchInterval ?? 30 * 1000, // Default 30s refresh
    ...options,
  })
}

// Hook to get flights within bounds
export function useFlightStatesByBounds(
  bounds: { lamin: number; lomin: number; lamax: number; lomax: number },
  options?: {
    enabled?: boolean
    refetchInterval?: number
  },
) {
  return useQuery({
    queryKey: flightKeys.statesByBounds(bounds),
    queryFn: async () => {
      const response = await flightsFetchApi.getAllStates(bounds)
      return response.flights
    },
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
    refetchInterval: options?.refetchInterval ?? 30 * 1000,
    ...options,
  })
}

// Hook to get flights near a location
export function useFlightsNearLocation(
  lat: number,
  lon: number,
  radius: number,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  },
) {
  return useQuery({
    queryKey: flightKeys.statesNearLocation(lat, lon, radius),
    queryFn: async () => {
      const response = await flightsFetchApi.getFlightsNearLocation(lat, lon, radius)
      return response.flights
    },
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
    refetchInterval: options?.refetchInterval ?? 30 * 1000,
    ...options,
  })
}

// Hook to get flight track
export function useFlightTrack(icao24: string, time?: number) {
  return useQuery({
    queryKey: flightKeys.track(icao24, time),
    queryFn: async () => {
      const response = await flightsFetchApi.getFlightTrack(icao24, time)
      return response.track
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!icao24,
  })
}

// Hook to get flights by aircraft
export function useFlightsByAircraft(
  icao24: string,
  begin: number,
  end: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: flightKeys.byAircraft(icao24, begin, end),
    queryFn: async () => {
      const response = await flightsFetchApi.getFlightsByAircraft(icao24, begin, end)
      return response.flights
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!icao24 && !!begin && !!end && (options?.enabled ?? true),
  })
}

// Hook to get airport arrivals
export function useAirportArrivals(
  airport: string,
  begin: number,
  end: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: flightKeys.arrivals(airport, begin, end),
    queryFn: async () => {
      const response = await flightsFetchApi.getAirportArrivals(airport, begin, end)
      return response.arrivals
    },
    staleTime: 60 * 60 * 1000, // 1 hour - historical data doesn't change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!airport && !!begin && !!end && (options?.enabled ?? true),
  })
}

// Hook to get airport departures
export function useAirportDepartures(
  airport: string,
  begin: number,
  end: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: flightKeys.departures(airport, begin, end),
    queryFn: async () => {
      const response = await flightsFetchApi.getAirportDepartures(airport, begin, end)
      return response.departures
    },
    staleTime: 60 * 60 * 1000, // 1 hour - historical data doesn't change
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    enabled: !!airport && !!begin && !!end && (options?.enabled ?? true),
  })
}

// Hook to get single flight by ICAO24
export function useFlightByIcao24(
  icao24: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: flightKeys.byAircraft(icao24, 0, 0),
    queryFn: async () => {
      // Get all current flights and find the one with matching icao24
      const response = await flightsFetchApi.getAllStates()
      return response.flights.states.find(flight => flight.icao24 === icao24) || null
    },
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
    enabled: !!icao24 && (options?.enabled ?? true),
  })
}

// Hook to get flights for an airport (arrivals/departures)
export function useAirportFlights(
  airport: string,
  options?: { 
    type?: 'arrivals' | 'departures'
    enabled?: boolean 
  }
) {
  const now = Math.floor(Date.now() / 1000)
  const oneHourAgo = now - 3600
  
  return useQuery({
    queryKey: [...flightKeys.all, 'airport', airport, options?.type || 'all'],
    queryFn: async () => {
      // For free tier, we can only get current states, not historical arrivals/departures
      // If searching by IATA code (3 letters), we need to get airport info first
      if (airport.length === 3) {
        // Import the airports API to convert IATA to ICAO
        const { airportsApi } = await import('@/api')
        
        try {
          // Get airport details to find ICAO code
          const airportData = await airportsApi.getAirportByIATA(airport.toUpperCase())
          if (airportData && airportData.icao) {
            // Get flights near the airport coordinates
            const response = await flightsFetchApi.getFlightsNearLocation(
              airportData.latitude,
              airportData.longitude,
              1.5 // ~165km radius - larger area to catch more flights
            )
            
            // Return all flights in the area since we can't filter by actual airport
            return response.flights
          }
        } catch (error) {
          console.error('Failed to get airport data:', error)
        }
      }
      
      // If ICAO code (4 letters) or fallback
      const response = await flightsFetchApi.getAllStates()
      
      // Try to filter by airport code in callsign (not perfect but better than nothing)
      return response.flights.states.filter(flight => 
        flight.callsign?.toUpperCase().includes(airport.toUpperCase()) || false
      )
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - airport-specific searches can be cached longer
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!airport && (options?.enabled ?? true),
  })
}

// Suspense versions for SSR
export function useSuspenseFlightStates() {
  return useSuspenseQuery({
    queryKey: flightKeys.states(),
    queryFn: async () => {
      const response = await flightsFetchApi.getAllStates()
      return response.flights
    },
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  })
}

export function useSuspenseFlightsNearLocation(
  lat: number,
  lon: number,
  radius: number,
) {
  return useSuspenseQuery({
    queryKey: flightKeys.statesNearLocation(lat, lon, radius),
    queryFn: async () => {
      const response = await flightsFetchApi.getFlightsNearLocation(lat, lon, radius)
      return response.flights
    },
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  })
}
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import type { DepartureArrival, FlightsResponse } from '@/types/flight'
import { flightsApi } from '@/api/flights'

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
    queryFn: () => flightsApi.getAllStates(),
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
    queryFn: () => flightsApi.getAllStates(bounds),
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
    queryFn: () => flightsApi.getFlightsNearLocation(lat, lon, radius),
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
    queryFn: () => flightsApi.getFlightTrack(icao24, time),
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
    queryFn: () => flightsApi.getFlightsByAircraft(icao24, begin, end),
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
    queryFn: () => flightsApi.getAirportArrivals(airport, begin, end),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
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
    queryFn: () => flightsApi.getAirportDepartures(airport, begin, end),
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
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
      const allFlights = await flightsApi.getAllStates()
      return allFlights.find(flight => flight.icao24 === icao24) || null
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
      // So we'll return current flights and filter by callsign prefix if possible
      const allFlights = await flightsApi.getAllStates()
      
      // Try to filter by airport code in callsign (not perfect but better than nothing)
      return allFlights.filter(flight => 
        flight.callsign?.includes(airport) || false
      )
    },
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    enabled: !!airport && (options?.enabled ?? true),
  })
}

// Suspense versions for SSR
export function useSuspenseFlightStates() {
  return useSuspenseQuery({
    queryKey: flightKeys.states(),
    queryFn: () => flightsApi.getAllStates(),
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
    queryFn: () => flightsApi.getFlightsNearLocation(lat, lon, radius),
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  })
}
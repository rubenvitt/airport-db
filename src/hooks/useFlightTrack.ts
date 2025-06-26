import { useQuery } from '@tanstack/react-query'
import { flightsFetchApi } from '@/api/flights-fetch'
import { useFlightData } from './useFlightData'
import type { FlightTrack } from '@/types/flight'

interface UseFlightTrackOptions {
  enabled?: boolean
  refetchInterval?: number | false
  staleTime?: number
}

export function useFlightTrack(
  icao24: string,
  options: UseFlightTrackOptions = {}
) {
  const flightData = useFlightData()
  
  const {
    enabled = true,
    refetchInterval = false,
    staleTime = 300000, // 5 minutes
  } = options

  return useQuery({
    queryKey: ['flightTrack', icao24],
    queryFn: async () => {
      // Check if we already have the track cached in the store
      const cachedTrack = flightData.getFlightTrack(icao24)
      if (cachedTrack) {
        return { track: cachedTrack, source: 'store' as const }
      }

      // Fetch from API
      const result = await flightsFetchApi.getFlightTrack(icao24)
      
      // Store in the flight data store if we got a track
      if (result.track) {
        flightData.setFlightTrack(icao24, result.track)
      }
      
      return result
    },
    enabled: enabled && !!icao24,
    refetchInterval,
    staleTime,
    gcTime: 600000, // 10 minutes
  })
}

// Hook to prefetch multiple flight tracks
export function usePrefetchFlightTracks() {
  const flightData = useFlightData()
  
  return async (icao24s: string[]) => {
    const promises = icao24s.map(async (icao24) => {
      // Skip if already cached
      if (flightData.hasFlightTrack(icao24)) {
        return
      }
      
      try {
        const result = await flightsFetchApi.getFlightTrack(icao24)
        if (result.track) {
          flightData.setFlightTrack(icao24, result.track)
        }
      } catch (error) {
        console.warn(`Failed to fetch track for ${icao24}:`, error)
      }
    })
    
    await Promise.all(promises)
  }
}

// Hook to get all cached tracks
export function useCachedFlightTracks() {
  const flightData = useFlightData()
  return flightData.getAllTracks()
}
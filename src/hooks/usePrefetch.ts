// Hook for prefetching data based on user behavior

import { useCallback, useEffect } from 'react'
import { prefetch } from '@/api/cachedFetch'
import { API_CONFIG } from '@/api/config'

export function usePrefetch() {
  // Prefetch airport data on hover
  const prefetchAirport = useCallback(async (iataCode: string) => {
    if (!iataCode || iataCode.length !== 3) return
    
    const url = `${API_CONFIG.apiNinjas.baseUrl}${API_CONFIG.apiNinjas.endpoints.airports}`
    await prefetch(url, {
      params: { iata: iataCode },
      cache: {
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        persist: true,
      },
    })
  }, [])

  // Prefetch flight data for an airport
  const prefetchAirportFlights = useCallback(async (icaoCode: string) => {
    if (!icaoCode || icaoCode.length !== 4) return
    
    const now = Math.floor(Date.now() / 1000)
    const oneHourAgo = now - 3600
    
    // Prefetch arrivals
    await prefetch(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.flights.arrival}`,
      {
        params: { airport: icaoCode, begin: oneHourAgo, end: now },
        cache: {
          ttl: 5 * 60 * 1000, // 5 minutes
          persist: true,
        },
      }
    )
    
    // Prefetch departures
    await prefetch(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.flights.departure}`,
      {
        params: { airport: icaoCode, begin: oneHourAgo, end: now },
        cache: {
          ttl: 5 * 60 * 1000, // 5 minutes
          persist: true,
        },
      }
    )
  }, [])

  // Prefetch flights in area
  const prefetchFlightsInArea = useCallback(async (bounds: {
    lamin: number
    lomin: number
    lamax: number
    lomax: number
  }) => {
    await prefetch(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.allStates}`,
      {
        params: bounds,
        cache: {
          ttl: 30 * 1000, // 30 seconds
          persist: false,
        },
      }
    )
  }, [])

  // Prefetch common airports on mount
  useEffect(() => {
    const commonAirports = ['LAX', 'JFK', 'ORD', 'ATL', 'DFW', 'LHR', 'CDG', 'NRT', 'HKG', 'DXB']
    
    // Stagger prefetching to avoid overwhelming the API
    commonAirports.forEach((code, index) => {
      setTimeout(() => {
        prefetchAirport(code).catch(console.error)
      }, index * 500) // 500ms between each prefetch
    })
  }, [prefetchAirport])

  return {
    prefetchAirport,
    prefetchAirportFlights,
    prefetchFlightsInArea,
  }
}

// Hook to prefetch data when element is visible
export function usePrefetchOnVisible<T extends HTMLElement>(
  prefetchFn: () => Promise<void>,
  options?: IntersectionObserverInit
) {
  const ref = useCallback((node: T | null) => {
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            prefetchFn().catch(console.error)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px', // Start prefetching 50px before visible
        ...options,
      }
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [prefetchFn, options])

  return ref
}
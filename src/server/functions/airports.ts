// Server functions for airport data with Redis caching

import { createServerFn } from '@tanstack/start'
import { airportCache } from '../services/airportCache'
import { concurrencyManager } from '../services/concurrencyManager'
import type { Airport, AirportSearchParams } from '@/types/airport'
import type { CacheItem } from '@/types/cache'

// Initialize cache service on first import
await airportCache.initialize()

// External API configuration
const API_NINJAS_URL = process.env.VITE_API_NINJAS_API_URL || 'https://api.api-ninjas.com/v1'
const API_NINJAS_KEY = process.env.VITE_API_NINJAS_API_KEY || ''

// Helper function to call external API
async function fetchFromExternalApi(params: Record<string, string>): Promise<Airport[]> {
  if (!API_NINJAS_KEY) {
    throw new Error('API Ninjas API key is not configured')
  }

  const url = new URL(`${API_NINJAS_URL}/airports`)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value)
  })

  const response = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': API_NINJAS_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Server function to get airport by IATA code
export const getAirportByIATA = createServerFn(
  'GET',
  async (iataCode: string): Promise<{ airport: Airport | null; source: 'cache' | 'api' }> => {
    // Check cache first
    const cached = await airportCache.get(iataCode)
    if (cached) {
      return { airport: cached.data, source: 'cache' }
    }

    // Use concurrency manager to prevent duplicate API calls
    const result = await concurrencyManager.deduplicateOperation(
      `airport:iata:${iataCode}`,
      async () => {
        // Double-check cache in case another request populated it
        const cachedAgain = await airportCache.get(iataCode)
        if (cachedAgain) {
          return { airport: cachedAgain.data, source: 'cache' as const }
        }

        // Fetch from external API
        const airports = await fetchFromExternalApi({ iata: iataCode })
        const airport = airports[0] || null

        // Cache the result
        if (airport) {
          await airportCache.set(iataCode, airport)
          // Also cache by ICAO if available
          if (airport.icao) {
            await airportCache.set(airport.icao, airport)
          }
        }

        return { airport, source: 'api' as const }
      },
      { ttl: 30 } // Lock expires after 30 seconds
    )

    return result
  }
)

// Server function to get airport by ICAO code
export const getAirportByICAO = createServerFn(
  'GET',
  async (icaoCode: string): Promise<{ airport: Airport | null; source: 'cache' | 'api' }> => {
    // Check cache first
    const cached = await airportCache.get(icaoCode)
    if (cached) {
      return { airport: cached.data, source: 'cache' }
    }

    // Use concurrency manager to prevent duplicate API calls
    const result = await concurrencyManager.deduplicateOperation(
      `airport:icao:${icaoCode}`,
      async () => {
        // Double-check cache in case another request populated it
        const cachedAgain = await airportCache.get(icaoCode)
        if (cachedAgain) {
          return { airport: cachedAgain.data, source: 'cache' as const }
        }

        // Fetch from external API
        const airports = await fetchFromExternalApi({ icao: icaoCode })
        const airport = airports[0] || null

        // Cache the result
        if (airport) {
          await airportCache.set(icaoCode, airport)
          // Also cache by IATA if available
          if (airport.iata) {
            await airportCache.set(airport.iata, airport)
          }
        }

        return { airport, source: 'api' as const }
      },
      { ttl: 30 } // Lock expires after 30 seconds
    )

    return result
  }
)

// Server function to search airports
export const searchAirports = createServerFn(
  'GET',
  async (params: AirportSearchParams): Promise<{ airports: Airport[]; source: 'cache' | 'api' | 'mixed' }> => {
    // For IATA/ICAO searches, check cache first
    if (params.iata && !params.icao) {
      const result = await getAirportByIATA(params.iata)
      return { 
        airports: result.airport ? [result.airport] : [], 
        source: result.source 
      }
    }

    if (params.icao && !params.iata) {
      const result = await getAirportByICAO(params.icao)
      return { 
        airports: result.airport ? [result.airport] : [], 
        source: result.source 
      }
    }

    // For other searches or combined searches, go directly to API
    // (Premium features not available in free tier)
    const freeParams: Record<string, string> = {}
    if (params.iata) freeParams.iata = params.iata
    if (params.icao) freeParams.icao = params.icao

    const airports = await fetchFromExternalApi(freeParams)

    // Cache individual results
    for (const airport of airports) {
      if (airport.iata) {
        await airportCache.set(airport.iata, airport)
      }
      if (airport.icao) {
        await airportCache.set(airport.icao, airport)
      }
    }

    return { airports, source: 'api' }
  }
)

// Server function to get cache statistics
export const getCacheStats = createServerFn(
  'GET',
  async () => {
    return await airportCache.getStats()
  }
)

// Server function to clear cache (admin function)
export const clearAirportCache = createServerFn(
  'POST',
  async (pattern?: string) => {
    const cleared = await airportCache.clear(pattern)
    return { cleared }
  }
)
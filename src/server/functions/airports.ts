// Server functions for airport data with Redis caching and rate limiting

import { createServerFn } from '@tanstack/start'
import { airportCache } from '../services/airportCache'
import { concurrencyManager } from '../services/concurrencyManager'
import { withRateLimit, withApiKeyRateLimit } from '../middleware/withRateLimit'
import type { Airport } from '@/types/airport'

// External API configuration
const API_NINJAS_URL = process.env.VITE_API_NINJAS_API_URL || 'https://api.api-ninjas.com/v1'
const API_NINJAS_KEY = process.env.VITE_API_NINJAS_API_KEY

// Helper to fetch from API Ninjas
async function fetchFromApiNinjas(endpoint: string, params?: Record<string, any>): Promise<any> {
  if (!API_NINJAS_KEY) {
    throw new Error('API Ninjas API key is not configured')
  }

  const url = new URL(`${API_NINJAS_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    headers: {
      'X-Api-Key': API_NINJAS_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API Ninjas error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Base function to get airport by IATA code
const getAirportByIATABase = createServerFn('GET', async (iataCode: string): Promise<Airport | null> => {
  // Normalize the code
  const code = iataCode.toUpperCase().trim()
  
  // Validate IATA code format (3 letters)
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new Error('Invalid IATA code format. Must be 3 letters.')
  }

  // Deduplicate concurrent requests
  return concurrencyManager.deduplicateOperation(
    `airport:iata:${code}`,
    async () => {
      // Check cache first
      const cached = await airportCache.get(code)
      if (cached) {
        return { ...cached.data, source: 'cache' as const }
      }

      // Fetch from external API
      const airports = await fetchFromApiNinjas('/airports', { iata: code })
      
      if (!airports || airports.length === 0) {
        return null
      }

      const airport = airports[0] as Airport
      
      // Cache the result
      await airportCache.set(code, airport)
      
      return { ...airport, source: 'api' as const }
    }
  )
})

// Base function to get airport by ICAO code
const getAirportByICAOBase = createServerFn('GET', async (icaoCode: string): Promise<Airport | null> => {
  // Normalize the code
  const code = icaoCode.toUpperCase().trim()
  
  // Validate ICAO code format (4 letters)
  if (!/^[A-Z]{4}$/.test(code)) {
    throw new Error('Invalid ICAO code format. Must be 4 letters.')
  }

  // Deduplicate concurrent requests
  return concurrencyManager.deduplicateOperation(
    `airport:icao:${code}`,
    async () => {
      // Check cache first (using ICAO as key)
      const cached = await airportCache.get(code)
      if (cached) {
        return { ...cached.data, source: 'cache' as const }
      }

      // Fetch from external API
      const airports = await fetchFromApiNinjas('/airports', { icao: code })
      
      if (!airports || airports.length === 0) {
        return null
      }

      const airport = airports[0] as Airport
      
      // Cache the result with both ICAO and IATA (if available) as keys
      await airportCache.set(code, airport)
      if (airport.iata) {
        await airportCache.set(airport.iata, airport)
      }
      
      return { ...airport, source: 'api' as const }
    }
  )
})

// Base function to search airports
const searchAirportsBase = createServerFn('GET', async (params: {
  iata?: string
  icao?: string
  apiKey?: string
}): Promise<Airport[]> => {
  // Free tier only supports IATA and ICAO parameters
  if (!params.iata && !params.icao) {
    throw new Error('Either IATA or ICAO code is required for search')
  }

  const searchParams: Record<string, string> = {}
  if (params.iata) searchParams.iata = params.iata.toUpperCase()
  if (params.icao) searchParams.icao = params.icao.toUpperCase()

  // For single code searches, try cache first
  if (params.iata && !params.icao) {
    const cached = await airportCache.get(params.iata.toUpperCase())
    if (cached) {
      return [{ ...cached.data, source: 'cache' as const }]
    }
  } else if (params.icao && !params.iata) {
    const cached = await airportCache.get(params.icao.toUpperCase())
    if (cached) {
      return [{ ...cached.data, source: 'cache' as const }]
    }
  }

  // Fetch from external API
  const airports = await fetchFromApiNinjas('/airports', searchParams)
  
  if (!airports || !Array.isArray(airports)) {
    return []
  }

  // Cache individual results
  for (const airport of airports) {
    if (airport.iata) {
      await airportCache.set(airport.iata, airport)
    }
    if (airport.icao) {
      await airportCache.set(airport.icao, airport)
    }
  }

  return airports.map((airport: Airport) => ({ ...airport, source: 'api' as const }))
})

// Export rate-limited versions of the functions
export const getAirportByIATA = withRateLimit(
  getAirportByIATABase,
  'airportLookup',
  {
    keyGenerator: (iataCode: string) => `airport:iata:${iataCode.toUpperCase()}`
  }
)

export const getAirportByICAO = withRateLimit(
  getAirportByICAOBase,
  'airportLookup',
  {
    keyGenerator: (icaoCode: string) => `airport:icao:${icaoCode.toUpperCase()}`
  }
)

export const searchAirports = withApiKeyRateLimit(
  searchAirportsBase,
  {
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 50,           // 50 requests per minute with API key
    standardHeaders: true,
    message: 'Airport search rate limit exceeded. Please wait before making more requests.'
  }
)

// Export cache statistics function
export const getAirportCacheStats = withRateLimit(
  createServerFn('GET', async () => {
    return await airportCache.getStats()
  }),
  'cacheStats'
)
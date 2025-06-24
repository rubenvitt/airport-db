// Server functions for flight data with Redis caching

import { createServerFn } from '@tanstack/start'
import { getRedisClient } from '../services/redisClient'
import { concurrencyManager } from '../services/concurrencyManager'
import type {
  DepartureArrival,
  FlightState,
  FlightTrack,
  FlightsResponse,
} from '@/types/flight'
import type { CacheItem } from '@/types/cache'

// External API configuration
const OPENSKY_URL = process.env.VITE_OPENSKY_API_URL || 'https://opensky-network.org/api'
const OPENSKY_USERNAME = process.env.VITE_OPENSKY_USERNAME
const OPENSKY_PASSWORD = process.env.VITE_OPENSKY_PASSWORD

// Cache configuration
const CACHE_TTL = {
  allStates: 30, // 30 seconds for real-time data
  tracks: 5 * 60, // 5 minutes for flight tracks
  aircraft: 60 * 60, // 1 hour for historical flight data
  airport: 5 * 60, // 5 minutes for airport arrivals/departures
}

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
    const auth = Buffer.from(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`).toString('base64')
    return { Authorization: `Basic ${auth}` }
  }
  return {}
}

// Helper to fetch from OpenSky API
async function fetchFromOpenSky<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const url = new URL(`${OPENSKY_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Generic cache wrapper for flight data
async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<{ data: T; source: 'cache' | 'api' }> {
  const redis = await getRedisClient()
  
  // Try cache first
  if (redis) {
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        const cacheItem = JSON.parse(cached) as CacheItem<T>
        return { data: cacheItem.data, source: 'cache' }
      }
    } catch (error) {
      console.error('Cache get error:', error)
    }
  }

  // Use concurrency manager to prevent duplicate API calls
  const result = await concurrencyManager.deduplicateOperation(
    cacheKey,
    async () => {
      // Double-check cache
      if (redis) {
        const cached = await redis.get(cacheKey)
        if (cached) {
          const cacheItem = JSON.parse(cached) as CacheItem<T>
          return { data: cacheItem.data, source: 'cache' as const }
        }
      }

      // Fetch from API
      const data = await fetchFn()

      // Cache the result
      if (redis) {
        const cacheItem: CacheItem<T> = {
          data,
          source: 'api',
          fetchedAt: Date.now(),
          expiresAt: Date.now() + (ttl * 1000),
        }
        
        try {
          await redis.setex(cacheKey, ttl, JSON.stringify(cacheItem))
        } catch (error) {
          console.error('Cache set error:', error)
        }
      }

      return { data, source: 'api' as const }
    },
    { ttl: 30 } // Lock expires after 30 seconds
  )

  return result
}

// Server function to get all current flight states
export const getAllFlightStates = createServerFn(
  'GET',
  async (params?: {
    lamin?: number
    lomin?: number
    lamax?: number
    lomax?: number
  }): Promise<{ flights: FlightsResponse; source: 'cache' | 'api' }> => {
    const cacheKey = `flights:states:${JSON.stringify(params || {})}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL.allStates,
      () => fetchFromOpenSky<FlightsResponse>('/states/all', params)
    )

    return { flights: result.data, source: result.source }
  }
)

// Server function to get flight track
export const getFlightTrack = createServerFn(
  'GET',
  async (params: {
    icao24: string
    time?: number
  }): Promise<{ track: FlightTrack | null; source: 'cache' | 'api' }> => {
    const time = params.time || Math.floor(Date.now() / 1000) - 1800
    const cacheKey = `flights:track:${params.icao24}:${time}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL.tracks,
      () => fetchFromOpenSky<FlightTrack>('/tracks/all', {
        icao24: params.icao24,
        time,
      })
    )

    return { track: result.data, source: result.source }
  }
)

// Server function to get flights by aircraft
export const getFlightsByAircraft = createServerFn(
  'GET',
  async (params: {
    icao24: string
    begin: number
    end: number
  }): Promise<{ flights: DepartureArrival[]; source: 'cache' | 'api' }> => {
    const cacheKey = `flights:aircraft:${params.icao24}:${params.begin}:${params.end}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL.aircraft,
      () => fetchFromOpenSky<DepartureArrival[]>('/flights/aircraft', params)
    )

    return { flights: result.data, source: result.source }
  }
)

// Server function to get airport arrivals
export const getAirportArrivals = createServerFn(
  'GET',
  async (params: {
    airport: string
    begin: number
    end: number
  }): Promise<{ arrivals: DepartureArrival[]; source: 'cache' | 'api' }> => {
    const cacheKey = `flights:arrivals:${params.airport}:${params.begin}:${params.end}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL.airport,
      () => fetchFromOpenSky<DepartureArrival[]>('/flights/arrival', params)
    )

    return { arrivals: result.data, source: result.source }
  }
)

// Server function to get airport departures
export const getAirportDepartures = createServerFn(
  'GET',
  async (params: {
    airport: string
    begin: number
    end: number
  }): Promise<{ departures: DepartureArrival[]; source: 'cache' | 'api' }> => {
    const cacheKey = `flights:departures:${params.airport}:${params.begin}:${params.end}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL.airport,
      () => fetchFromOpenSky<DepartureArrival[]>('/flights/departure', params)
    )

    return { departures: result.data, source: result.source }
  }
)

// Server function to get flights near location
export const getFlightsNearLocation = createServerFn(
  'GET',
  async (params: {
    lat: number
    lon: number
    radius: number
  }): Promise<{ flights: FlightsResponse; source: 'cache' | 'api' }> => {
    const bbox = {
      lamin: params.lat - params.radius,
      lomin: params.lon - params.radius,
      lamax: params.lat + params.radius,
      lomax: params.lon + params.radius,
    }

    return getAllFlightStates(bbox)
  }
)
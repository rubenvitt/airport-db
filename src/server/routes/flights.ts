import { Router } from 'express'
import { getRedisClient } from '../services/redisClient.js'
import { concurrencyManager } from '../services/concurrencyManager.js'
import { openskyAuth } from '../services/openskyAuth.js'
import type {
  DepartureArrival,
  FlightState,
  FlightTrack,
  FlightsResponse,
} from '../../types/flight.js'
import type { CacheItem } from '../../types/cache.js'

// External API configuration
const OPENSKY_URL = process.env.VITE_OPENSKY_API_URL || 'https://opensky-network.org/api'

// Cache configuration
const CACHE_TTL = {
  allStates: 30, // 30 seconds for real-time data
  tracks: 5 * 60, // 5 minutes for flight tracks
  aircraft: 60 * 60, // 1 hour for historical flight data
  airport: 5 * 60, // 5 minutes for airport arrivals/departures
}

// Helper to get auth headers using OAuth2 or Basic Auth
async function getAuthHeaders(): Promise<HeadersInit> {
  return openskyAuth.getAuthHeaders()
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
    headers: await getAuthHeaders(),
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

export function createFlightRoutes() {
  const router = Router()

  // Get all current flight states
  router.get('/states', async (req, res, next) => {
    try {
      const { lamin, lomin, lamax, lomax } = req.query
      
      const params = {
        ...(lamin && { lamin: Number(lamin) }),
        ...(lomin && { lomin: Number(lomin) }),
        ...(lamax && { lamax: Number(lamax) }),
        ...(lomax && { lomax: Number(lomax) }),
      }

      const cacheKey = `flights:states:${JSON.stringify(params)}`
      
      const result = await withCache(
        cacheKey,
        CACHE_TTL.allStates,
        () => fetchFromOpenSky<FlightsResponse>('/states/all', Object.keys(params).length > 0 ? params : undefined)
      )

      res.json({ flights: result.data, source: result.source })
    } catch (error) {
      next(error)
    }
  })

  // Get flight track  
  router.get('/track/:icao24([a-fA-F0-9]{6})', async (req, res, next) => {
    try {
      const { icao24 } = req.params
      const { time } = req.query

      const trackTime = time ? Number(time) : Math.floor(Date.now() / 1000) - 1800
      const cacheKey = `flights:track:${icao24}:${trackTime}`
      
      const result = await withCache(
        cacheKey,
        CACHE_TTL.tracks,
        () => fetchFromOpenSky<FlightTrack>('/tracks/all', {
          icao24,
          time: trackTime,
        })
      )

      res.json({ track: result.data, source: result.source })
    } catch (error) {
      next(error)
    }
  })

  // Get flights by aircraft
  router.get('/aircraft/:icao24([a-fA-F0-9]{6})', async (req, res, next) => {
    try {
      const { icao24 } = req.params
      const { begin, end } = req.query

      if (!begin || !end) {
        return res.status(400).json({
          error: 'begin and end timestamps are required'
        })
      }

      const cacheKey = `flights:aircraft:${icao24}:${begin}:${end}`
      
      const result = await withCache(
        cacheKey,
        CACHE_TTL.aircraft,
        () => fetchFromOpenSky<DepartureArrival[]>('/flights/aircraft', {
          icao24,
          begin: Number(begin),
          end: Number(end),
        })
      )

      res.json({ flights: result.data, source: result.source })
    } catch (error) {
      next(error)
    }
  })

  // Get airport arrivals
  router.get('/arrivals/:airport([A-Z]{3,4})', async (req, res, next) => {
    try {
      const { airport } = req.params
      const { begin, end } = req.query

      if (!begin || !end) {
        return res.status(400).json({
          error: 'begin and end timestamps are required'
        })
      }

      const cacheKey = `flights:arrivals:${airport}:${begin}:${end}`
      
      const result = await withCache(
        cacheKey,
        CACHE_TTL.airport,
        () => fetchFromOpenSky<DepartureArrival[]>('/flights/arrival', {
          airport,
          begin: Number(begin),
          end: Number(end),
        })
      )

      res.json({ arrivals: result.data, source: result.source })
    } catch (error) {
      next(error)
    }
  })

  // Get airport departures
  router.get('/departures/:airport([A-Z]{3,4})', async (req, res, next) => {
    try {
      const { airport } = req.params
      const { begin, end } = req.query

      if (!begin || !end) {
        return res.status(400).json({
          error: 'begin and end timestamps are required'
        })
      }

      const cacheKey = `flights:departures:${airport}:${begin}:${end}`
      
      const result = await withCache(
        cacheKey,
        CACHE_TTL.airport,
        () => fetchFromOpenSky<DepartureArrival[]>('/flights/departure', {
          airport,
          begin: Number(begin),
          end: Number(end),
        })
      )

      res.json({ departures: result.data, source: result.source })
    } catch (error) {
      next(error)
    }
  })

  // Get flights near location
  router.get('/near', async (req, res, next) => {
    try {
      const { lat, lon, radius } = req.query

      if (!lat || !lon || !radius) {
        return res.status(400).json({
          error: 'lat, lon, and radius parameters are required'
        })
      }

      const bbox = {
        lamin: Number(lat) - Number(radius),
        lomin: Number(lon) - Number(radius),
        lamax: Number(lat) + Number(radius),
        lomax: Number(lon) + Number(radius),
      }

      const cacheKey = `flights:states:${JSON.stringify(bbox)}`
      
      const result = await withCache(
        cacheKey,
        CACHE_TTL.allStates,
        () => fetchFromOpenSky<FlightsResponse>('/states/all', bbox)
      )

      res.json({ flights: result.data, source: result.source })
    } catch (error) {
      next(error)
    }
  })

  // Get authentication status
  router.get('/auth-status', async (req, res, next) => {
    try {
      const authType = openskyAuth.getAuthType()
      const isAuthenticated = authType !== 'none'
      
      res.json({
        authType,
        isAuthenticated,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
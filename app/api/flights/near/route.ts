import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '../../../../src/server/services/redisClient'
import { concurrencyManager } from '../../../../src/server/services/concurrencyManager'
import { openskyAuth } from '../../../../src/server/services/openskyAuth'
import type { FlightsResponse } from '../../../../src/types/flight'
import type { CacheItem } from '../../../../src/types/cache'
import { parseOpenSkyResponse } from '../../../../src/utils/opensky-parser'

// External API configuration
const OPENSKY_URL = process.env.OPENSKY_API_URL || 'https://opensky-network.org/api'
const CACHE_TTL = 30 // 30 seconds for real-time data

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
        // Ensure cached data is properly formatted
        if (cacheItem.data && typeof cacheItem.data === 'object' && 'states' in cacheItem.data) {
          return { data: cacheItem.data, source: 'cache' }
        }
        // If old cache format, parse it
        const parsedData = parseOpenSkyResponse(cacheItem.data) as T
        return { data: parsedData, source: 'cache' }
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
          // Ensure cached data is properly formatted
          if (cacheItem.data && typeof cacheItem.data === 'object' && 'states' in cacheItem.data) {
            return { data: cacheItem.data, source: 'cache' as const }
          }
          // If old cache format, parse it
          const parsedData = parseOpenSkyResponse(cacheItem.data) as T
          return { data: parsedData, source: 'cache' as const }
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

// Convert radius in degrees to bounding box
function getBoundingBox(lat: number, lon: number, radiusDegrees: number) {
  return {
    lamin: lat - radiusDegrees,
    lamax: lat + radiusDegrees,
    lomin: lon - radiusDegrees,
    lomax: lon + radiusDegrees,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const radius = searchParams.get('radius') || '1.5' // Default to ~165km
    
    if (!lat || !lon) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }
    
    const latitude = Number(lat)
    const longitude = Number(lon)
    const radiusDegrees = Number(radius)
    
    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusDegrees)) {
      return NextResponse.json(
        { error: 'Invalid latitude, longitude, or radius' },
        { status: 400 }
      )
    }
    
    // Convert radius to bounding box
    const bbox = getBoundingBox(latitude, longitude, radiusDegrees)
    
    const cacheKey = `flights:near:${latitude}:${longitude}:${radiusDegrees}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL,
      async () => {
        const rawData = await fetchFromOpenSky<any>('/states/all', bbox)
        return parseOpenSkyResponse(rawData)
      }
    )

    return NextResponse.json({ flights: result.data, source: result.source })
  } catch (error) {
    console.error('Error in flights near API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
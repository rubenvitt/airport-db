import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '../../../../../src/server/services/redisClient'
import { concurrencyManager } from '../../../../../src/server/services/concurrencyManager'
import { openskyAuth } from '../../../../../src/server/services/openskyAuth'
import type { FlightTrack } from '../../../../../src/types/flight'
import type { CacheItem } from '../../../../../src/types/cache'

// External API configuration
const OPENSKY_URL = process.env.OPENSKY_API_URL || 'https://opensky-network.org/api'
const CACHE_TTL = 5 * 60 // 5 minutes for flight tracks

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

export async function GET(
  request: NextRequest,
  { params }: { params: { icao24: string } }
) {
  try {
    const { icao24 } = params
    const { searchParams } = new URL(request.url)
    const time = searchParams.get('time')

    // Validate ICAO24 format (6 hex characters)
    if (!/^[a-fA-F0-9]{6}$/.test(icao24)) {
      return NextResponse.json(
        { error: 'ICAO24 must be 6 hexadecimal characters' },
        { status: 400 }
      )
    }

    const trackTime = time ? Number(time) : Math.floor(Date.now() / 1000) - 1800
    const cacheKey = `flights:track:${icao24}:${trackTime}`
    
    const result = await withCache(
      cacheKey,
      CACHE_TTL,
      () => fetchFromOpenSky<FlightTrack>('/tracks/all', {
        icao24,
        time: trackTime,
      })
    )

    return NextResponse.json({ track: result.data, source: result.source })
  } catch (error) {
    console.error('Error in flight track API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
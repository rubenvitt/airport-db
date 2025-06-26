import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '../../../../src/server/services/redisClient'
import { concurrencyManager } from '../../../../src/server/services/concurrencyManager'
import { openskyAuth } from '../../../../src/server/services/openskyAuth'
import type { DepartureArrival } from '../../../../src/types/flight'
import type { CacheItem } from '../../../../src/types/cache'

// External API configuration
const OPENSKY_URL = process.env.OPENSKY_API_URL || process.env.VITE_OPENSKY_API_URL || 'https://opensky-network.org/api'
const CACHE_TTL = 3600 // 1 hour for historical data

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
    const errorText = await response.text()
    console.error('OpenSky API error response:', errorText)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const airport = searchParams.get('airport')
    const begin = searchParams.get('begin')
    const end = searchParams.get('end')
    
    if (!airport) {
      return NextResponse.json(
        { error: 'Airport code is required' },
        { status: 400 }
      )
    }
    
    // Default to yesterday's data if not specified
    // NOTE: OpenSky only provides departure data from the previous day or earlier
    const now = Math.floor(Date.now() / 1000)
    const yesterday = now - 86400 // 24 hours ago
    const twoDaysAgo = now - 172800 // 48 hours ago
    
    const beginTime = begin ? Number(begin) : twoDaysAgo
    const endTime = end ? Number(end) : yesterday
    
    if (isNaN(beginTime) || isNaN(endTime)) {
      return NextResponse.json(
        { error: 'Invalid begin or end time' },
        { status: 400 }
      )
    }
    
    // Check if authentication is available
    const hasAuth = await openskyAuth.isAuthenticated()
    if (!hasAuth) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'The OpenSky departures API requires authentication. Please configure your OpenSky credentials in the settings.'
        },
        { status: 401 }
      )
    }
    
    const cacheKey = `flights:departures:${airport}:${beginTime}:${endTime}`
    
    try {
      const result = await withCache(
        cacheKey,
        CACHE_TTL,
        () => fetchFromOpenSky<DepartureArrival[]>(
          `/flights/departure`,
          {
            airport: airport.toUpperCase(),
            begin: beginTime,
            end: endTime,
          }
        )
      )
      
      return NextResponse.json({ departures: result.data, source: result.source })
    } catch (error) {
      // If we get a 404, it likely means no flights found for the given period
      if (error instanceof Error && error.message.includes('404')) {
        console.log(`No departures found for ${airport} between ${new Date(beginTime * 1000).toISOString()} and ${new Date(endTime * 1000).toISOString()}`)
        return NextResponse.json({ 
          departures: [], 
          source: 'api',
          message: 'No departures found for the specified time period. Note: OpenSky only provides departure data from the previous day or earlier.'
        })
      }
      throw error // Re-throw other errors
    }
  } catch (error) {
    console.error('Error in flights departures API:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message.includes('401')) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'The OpenSky departures API requires authentication. Please configure your OpenSky credentials in the settings.'
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
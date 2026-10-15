import { NextResponse } from 'next/server'
import { getRedisClient } from '../../../../src/server/services/redisClient'

export async function GET() {
  try {
    const redis = await getRedisClient()
    
    if (!redis) {
      return NextResponse.json({
        hitRate: 0,
        hits: 0,
        misses: 0,
        staleHits: 0,
        errors: 0,
        entries: 0,
        size: 0,
        lastReset: new Date().toISOString(),
        avgResponseTime: null
      })
    }
    
    // Get all cache-related keys
    const keys = await redis.keys('flights:*')
    const airportKeys = await redis.keys('airport:*')
    const allKeys = [...keys, ...airportKeys]
    
    // Calculate cache stats
    let totalSize = 0
    let totalEntries = allKeys.length
    
    // Sample some keys to estimate average size
    const sampleSize = Math.min(10, allKeys.length)
    const sampleKeys = allKeys.slice(0, sampleSize)
    
    for (const key of sampleKeys) {
      const value = await redis.get(key)
      if (value) {
        totalSize += Buffer.byteLength(value)
      }
    }
    
    // Estimate total size based on sample
    const avgSizePerKey = sampleSize > 0 ? totalSize / sampleSize : 0
    const estimatedTotalSize = avgSizePerKey * totalEntries
    
    // Get basic stats from Redis info
    const info = await redis.info('stats')
    const keyspaceHits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0')
    const keyspaceMisses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0')
    const totalRequests = keyspaceHits + keyspaceMisses
    const hitRate = totalRequests > 0 ? keyspaceHits / totalRequests : 0
    
    return NextResponse.json({
      hitRate,
      hits: keyspaceHits,
      misses: keyspaceMisses,
      staleHits: 0, // Not tracked in basic Redis
      errors: 0, // Not tracked in basic Redis
      entries: totalEntries,
      size: Math.round(estimatedTotalSize),
      lastReset: new Date().toISOString(), // Not tracked in basic Redis
      avgResponseTime: null // Not tracked in basic Redis
    })
    
  } catch (error) {
    console.error('Error fetching cache stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cache statistics' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const redis = await getRedisClient()
    
    if (!redis) {
      return NextResponse.json({ cleared: 0 })
    }
    
    // Clear all cache keys
    const keys = await redis.keys('flights:*')
    const airportKeys = await redis.keys('airport:*')
    const allKeys = [...keys, ...airportKeys]
    
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
    }
    
    return NextResponse.json({ cleared: allKeys.length })
    
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}
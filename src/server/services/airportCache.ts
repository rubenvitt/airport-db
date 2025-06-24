// Airport caching service implementation

import type { Redis } from 'ioredis'
import { getRedisClient, getRedisCircuitBreaker } from './redisClient'
import { concurrencyManager } from './concurrencyManager'
import { inMemoryAirportCache } from './inMemoryCache'
import { ExponentialBackoff, CircuitState } from './circuitBreaker'
import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'
import type { Airport } from '../../types/airport'
import type { CacheItem, CacheStats, CacheService } from '../../types/cache'

const DEFAULT_TTL = parseInt(process.env.AIRPORT_CACHE_TTL || '2592000', 10) // 30 days
const CACHE_PREFIX = 'airport:'
const STATS_KEY = 'airport:stats'
const USE_IN_MEMORY_FALLBACK = process.env.USE_IN_MEMORY_CACHE_FALLBACK !== 'false'

const logger = new StructuredLogger(
  'airport-cache',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

class AirportCacheService implements CacheService<Airport> {
  private redis: Redis | null = null
  private fallbackMode = false
  private exponentialBackoff: ExponentialBackoff

  constructor() {
    this.exponentialBackoff = new ExponentialBackoff(
      parseInt(process.env.REDIS_BACKOFF_BASE_DELAY || '1000', 10),
      parseInt(process.env.REDIS_BACKOFF_MAX_DELAY || '30000', 10),
      parseInt(process.env.REDIS_BACKOFF_MAX_ATTEMPTS || '3', 10)
    )
  }

  async initialize(): Promise<void> {
    this.redis = await getRedisClient()
    if (!this.redis) {
      logger.warn('Redis not available, operating in fallback mode')
      this.fallbackMode = true
    }
    
    // Initialize in-memory cache if fallback is enabled
    if (USE_IN_MEMORY_FALLBACK) {
      await inMemoryAirportCache.initialize()
    }
    
    await concurrencyManager.initialize()
  }

  private getCacheKey(code: string): string {
    return `${CACHE_PREFIX}${code.toUpperCase()}`
  }

  async get(code: string): Promise<CacheItem<Airport> | null> {
    const key = this.getCacheKey(code)
    const circuitBreaker = getRedisCircuitBreaker()

    // If Redis is in fallback mode or circuit is open, try in-memory cache
    if (this.fallbackMode || !this.redis || 
        (circuitBreaker && circuitBreaker.getState() === CircuitState.OPEN)) {
      
      if (USE_IN_MEMORY_FALLBACK) {
        logger.debug('Using in-memory cache fallback', { code })
        const result = await inMemoryAirportCache.get(key)
        if (result) {
          await this.incrementStat('hits')
          return result
        }
      }
      
      await this.incrementStat('misses')
      return null
    }

    try {
      // Try Redis with exponential backoff
      const cached = await this.exponentialBackoff.execute(async () => {
        if (!this.redis) throw new Error('Redis client not available')
        return await this.redis.get(key)
      })

      if (!cached) {
        // Check in-memory cache as second level
        if (USE_IN_MEMORY_FALLBACK) {
          const inMemoryResult = await inMemoryAirportCache.get(key)
          if (inMemoryResult) {
            await this.incrementStat('hits')
            logger.debug('Cache hit from in-memory fallback', { code })
            return inMemoryResult
          }
        }
        
        await this.incrementStat('misses')
        return null
      }

      await this.incrementStat('hits')
      const result = JSON.parse(cached) as CacheItem<Airport>
      
      // Update in-memory cache with Redis data
      if (USE_IN_MEMORY_FALLBACK && result) {
        await inMemoryAirportCache.set(key, result.data, DEFAULT_TTL)
      }
      
      return result
    } catch (error) {
      logger.error('Cache get error, falling back to in-memory', error as Error)
      await this.incrementStat('errors')
      
      // Fallback to in-memory cache on error
      if (USE_IN_MEMORY_FALLBACK) {
        const result = await inMemoryAirportCache.get(key)
        if (result) {
          logger.info('Successfully retrieved from in-memory cache after Redis error', { code })
          return result
        }
      }
      
      return null
    }
  }

  async set(code: string, airport: Airport, ttl: number = DEFAULT_TTL): Promise<void> {
    const key = this.getCacheKey(code)
    const now = Date.now()
    const cacheItem: CacheItem<Airport> = {
      data: airport,
      source: 'cache',
      fetchedAt: now,
      expiresAt: now + (ttl * 1000),
    }

    // Always update in-memory cache if enabled
    if (USE_IN_MEMORY_FALLBACK) {
      await inMemoryAirportCache.set(key, airport, ttl)
    }

    // Skip Redis if in fallback mode
    if (this.fallbackMode || !this.redis) {
      logger.debug('Skipping Redis set due to fallback mode', { code })
      return
    }

    const circuitBreaker = getRedisCircuitBreaker()
    if (circuitBreaker && circuitBreaker.getState() === CircuitState.OPEN) {
      logger.debug('Skipping Redis set due to open circuit', { code })
      return
    }

    try {
      // Try to set in Redis with exponential backoff
      await this.exponentialBackoff.execute(async () => {
        if (!this.redis) throw new Error('Redis client not available')
        await this.redis.setex(key, ttl, JSON.stringify(cacheItem))
      })
      
      logger.debug('Successfully cached airport in Redis', { code, ttl })
    } catch (error) {
      logger.error('Cache set error, data saved to in-memory cache only', error as Error)
      await this.incrementStat('errors')
    }
  }

  async delete(code: string): Promise<boolean> {
    if (this.fallbackMode || !this.redis) {
      return false
    }

    try {
      const key = this.getCacheKey(code)
      const result = await this.redis.del(key)
      return result === 1
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }

  async exists(code: string): Promise<boolean> {
    if (this.fallbackMode || !this.redis) {
      return false
    }

    try {
      const key = this.getCacheKey(code)
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Cache exists error:', error)
      return false
    }
  }

  async clear(pattern?: string): Promise<number> {
    if (this.fallbackMode || !this.redis) {
      return 0
    }

    try {
      const searchPattern = pattern 
        ? `${CACHE_PREFIX}${pattern}*` 
        : `${CACHE_PREFIX}*`
      
      const keys = await this.redis.keys(searchPattern)
      if (keys.length === 0) {
        return 0
      }

      const result = await this.redis.del(...keys)
      return result
    } catch (error) {
      console.error('Cache clear error:', error)
      return 0
    }
  }

  async getStats(): Promise<CacheStats> {
    // Get in-memory stats first
    let inMemoryStats: CacheStats | null = null
    if (USE_IN_MEMORY_FALLBACK) {
      inMemoryStats = await inMemoryAirportCache.getStats()
    }

    if (this.fallbackMode || !this.redis) {
      return inMemoryStats || { hits: 0, misses: 0, errors: 0, lastReset: Date.now() }
    }

    try {
      const stats = await this.redis.hgetall(STATS_KEY)
      const redisStats = {
        hits: parseInt(stats.hits || '0', 10),
        misses: parseInt(stats.misses || '0', 10),
        errors: parseInt(stats.errors || '0', 10),
        lastReset: parseInt(stats.lastReset || Date.now().toString(), 10),
      }

      // If we have both, return Redis stats as primary
      // In-memory stats are just for fallback tracking
      return redisStats
    } catch (error) {
      logger.error('Get stats error, returning in-memory stats', error as Error)
      return inMemoryStats || { hits: 0, misses: 0, errors: 0, lastReset: Date.now() }
    }
  }

  private async incrementStat(stat: 'hits' | 'misses' | 'errors'): Promise<void> {
    // Always track stats in in-memory cache if available
    if (USE_IN_MEMORY_FALLBACK) {
      const stats = await inMemoryAirportCache.getStats()
      if (stat === 'hits') stats.hits++
      else if (stat === 'misses') stats.misses++
      else if (stat === 'errors') stats.errors++
    }

    if (this.fallbackMode || !this.redis) {
      return
    }

    const circuitBreaker = getRedisCircuitBreaker()
    if (circuitBreaker && circuitBreaker.getState() === CircuitState.OPEN) {
      return
    }

    try {
      await this.redis.hincrby(STATS_KEY, stat, 1)
      await this.redis.hset(STATS_KEY, 'lastUpdated', Date.now())
    } catch (error) {
      logger.error('Increment stat error', error as Error)
    }
  }

  async resetStats(): Promise<void> {
    if (this.fallbackMode || !this.redis) {
      return
    }

    try {
      await this.redis.del(STATS_KEY)
      await this.redis.hset(STATS_KEY, 'lastReset', Date.now())
    } catch (error) {
      console.error('Reset stats error:', error)
    }
  }
}

// Export singleton instance
export const airportCache = new AirportCacheService()
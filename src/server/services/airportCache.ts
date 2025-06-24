// Airport caching service implementation

import type { Redis } from 'ioredis'
import { getRedisClient } from './redisClient'
import { concurrencyManager } from './concurrencyManager'
import type { Airport } from '@/types/airport'
import type { CacheItem, CacheStats, CacheService } from '@/types/cache'

const DEFAULT_TTL = parseInt(process.env.AIRPORT_CACHE_TTL || '2592000', 10) // 30 days
const CACHE_PREFIX = 'airport:'
const STATS_KEY = 'airport:stats'

class AirportCacheService implements CacheService<Airport> {
  private redis: Redis | null = null
  private fallbackMode = false

  async initialize(): Promise<void> {
    this.redis = await getRedisClient()
    if (!this.redis) {
      console.warn('Redis not available, operating in fallback mode')
      this.fallbackMode = true
    }
    await concurrencyManager.initialize()
  }

  private getCacheKey(code: string): string {
    return `${CACHE_PREFIX}${code.toUpperCase()}`
  }

  async get(code: string): Promise<CacheItem<Airport> | null> {
    if (this.fallbackMode || !this.redis) {
      await this.incrementStat('misses')
      return null
    }

    try {
      const key = this.getCacheKey(code)
      const cached = await this.redis.get(key)

      if (!cached) {
        await this.incrementStat('misses')
        return null
      }

      await this.incrementStat('hits')
      return JSON.parse(cached) as CacheItem<Airport>
    } catch (error) {
      console.error('Cache get error:', error)
      await this.incrementStat('errors')
      return null
    }
  }

  async set(code: string, airport: Airport, ttl: number = DEFAULT_TTL): Promise<void> {
    if (this.fallbackMode || !this.redis) {
      return
    }

    try {
      const key = this.getCacheKey(code)
      const now = Date.now()
      const cacheItem: CacheItem<Airport> = {
        data: airport,
        source: 'cache',
        fetchedAt: now,
        expiresAt: now + (ttl * 1000),
      }

      await this.redis.setex(key, ttl, JSON.stringify(cacheItem))
    } catch (error) {
      console.error('Cache set error:', error)
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
    if (this.fallbackMode || !this.redis) {
      return { hits: 0, misses: 0, errors: 0, lastReset: Date.now() }
    }

    try {
      const stats = await this.redis.hgetall(STATS_KEY)
      return {
        hits: parseInt(stats.hits || '0', 10),
        misses: parseInt(stats.misses || '0', 10),
        errors: parseInt(stats.errors || '0', 10),
        lastReset: parseInt(stats.lastReset || Date.now().toString(), 10),
      }
    } catch (error) {
      console.error('Get stats error:', error)
      return { hits: 0, misses: 0, errors: 0, lastReset: Date.now() }
    }
  }

  private async incrementStat(stat: 'hits' | 'misses' | 'errors'): Promise<void> {
    if (this.fallbackMode || !this.redis) {
      return
    }

    try {
      await this.redis.hincrby(STATS_KEY, stat, 1)
      await this.redis.hset(STATS_KEY, 'lastUpdated', Date.now())
    } catch (error) {
      console.error('Increment stat error:', error)
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
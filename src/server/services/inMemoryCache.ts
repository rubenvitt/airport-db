// In-memory cache fallback implementation for when Redis is unavailable

import type { Airport } from '../../types/airport'
import type { CacheItem, CacheStats, CacheService } from '../../types/cache'
import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'

const logger = new StructuredLogger(
  'in-memory-cache',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

interface InMemoryCacheEntry<T> {
  item: CacheItem<T>
  expiresAt: number
}

export class InMemoryCache<T = any> implements CacheService<T> {
  private cache = new Map<string, InMemoryCacheEntry<T>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    errors: 0,
    lastReset: Date.now()
  }
  private cleanupInterval: NodeJS.Timer | null = null
  private maxSize: number
  private evictionCheckInterval: number

  constructor(
    maxSize = parseInt(process.env.IN_MEMORY_CACHE_MAX_SIZE || '1000', 10),
    evictionCheckInterval = parseInt(process.env.IN_MEMORY_CACHE_CLEANUP_INTERVAL || '300000', 10) // 5 minutes
  ) {
    this.maxSize = maxSize
    this.evictionCheckInterval = evictionCheckInterval
    this.startCleanupTimer()
  }

  async initialize(): Promise<void> {
    logger.info('In-memory cache initialized', { maxSize: this.maxSize })
  }

  async get(key: string): Promise<CacheItem<T> | null> {
    try {
      const entry = this.cache.get(key)
      
      if (!entry) {
        this.stats.misses++
        return null
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key)
        this.stats.misses++
        logger.debug('Cache entry expired', { key })
        return null
      }

      this.stats.hits++
      return entry.item
    } catch (error) {
      this.stats.errors++
      logger.error('Cache get error', error as Error, { key })
      return null
    }
  }

  async set(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      // Enforce size limit with LRU eviction
      if (this.cache.size >= this.maxSize) {
        this.evictOldest()
      }

      const now = Date.now()
      const cacheItem: CacheItem<T> = {
        data,
        source: 'in-memory',
        fetchedAt: now,
        expiresAt: now + (ttlSeconds * 1000)
      }

      this.cache.set(key, {
        item: cacheItem,
        expiresAt: cacheItem.expiresAt
      })

      logger.debug('Cache entry set', { key, ttlSeconds })
    } catch (error) {
      this.stats.errors++
      logger.error('Cache set error', error as Error, { key })
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const existed = this.cache.has(key)
      this.cache.delete(key)
      return existed
    } catch (error) {
      this.stats.errors++
      logger.error('Cache delete error', error as Error, { key })
      return false
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key)
      if (!entry) return false
      
      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key)
        return false
      }
      
      return true
    } catch (error) {
      this.stats.errors++
      logger.error('Cache exists error', error as Error, { key })
      return false
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      let deleted = 0
      
      if (!pattern) {
        deleted = this.cache.size
        this.cache.clear()
      } else {
        // Simple pattern matching (supports * wildcard at end)
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        for (const [key] of this.cache) {
          if (regex.test(key)) {
            this.cache.delete(key)
            deleted++
          }
        }
      }
      
      logger.info('Cache cleared', { pattern, deleted })
      return deleted
    } catch (error) {
      this.stats.errors++
      logger.error('Cache clear error', error as Error, { pattern })
      return 0
    }
  }

  async getStats(): Promise<CacheStats> {
    return { ...this.stats }
  }

  async resetStats(): Promise<void> {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      lastReset: Date.now()
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    // Find the oldest entry
    for (const [key, entry] of this.cache) {
      if (entry.item.fetchedAt < oldestTime) {
        oldestTime = entry.item.fetchedAt
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      logger.debug('Evicted oldest cache entry', { key: oldestKey })
    }
  }

  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up expired entries', { count: cleaned })
    }
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, this.evictionCheckInterval)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
    logger.info('In-memory cache destroyed')
  }
}

// Singleton instance for airport cache
export const inMemoryAirportCache = new InMemoryCache<Airport>()
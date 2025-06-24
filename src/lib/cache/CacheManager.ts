// Main cache manager implementation

import type { 
  CacheManager as ICacheManager, 
  CacheEntry, 
  CacheOptions, 
  CacheStats,
  CacheConfig,
  CacheEventType,
  CacheEvent,
  StorageAdapter,
  CacheMetadata
} from './types'
import { MemoryAdapter } from './storage/MemoryAdapter'
import { IndexedDBAdapter } from './storage/IndexedDBAdapter'
import { RedisAdapter } from './storage/RedisAdapter'
import { EventEmitter } from '@/lib/eventBus'
import { selectStrategy } from './strategies'
import { extractEndpoint } from './utils/cacheKey'

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  enableCompression: true,
  enablePersistence: true,
  enablePrefetch: true,
  evictionPolicy: 'lru',
  compressionThreshold: 10 * 1024, // 10KB
}

export class CacheManager implements ICacheManager {
  private memoryAdapter: MemoryAdapter
  private redisAdapter: RedisAdapter | null = null
  private persistAdapter: IndexedDBAdapter | null = null
  private config: CacheConfig
  private stats: CacheStats
  private eventBus: EventEmitter
  private pruneInterval: NodeJS.Timer | null = null

  constructor(config: Partial<CacheConfig> = {}, redisClient?: any) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.memoryAdapter = new MemoryAdapter(this.config.maxEntries)
    this.eventBus = new EventEmitter()
    
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      errors: 0,
      size: 0,
      entries: 0,
      lastReset: Date.now(),
    }

    // Initialize Redis adapter if client provided
    if (redisClient) {
      this.redisAdapter = new RedisAdapter(redisClient, this.config.compressionThreshold)
    }

    // Initialize IndexedDB adapter for client-side persistence
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      this.persistAdapter = new IndexedDBAdapter(this.config.compressionThreshold)
    }

    // Start periodic pruning
    this.startPruning()
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      // Try memory cache first
      let entry = await this.memoryAdapter.get<T>(key)
      
      // Try Redis cache if not in memory
      if (!entry && this.redisAdapter && this.redisAdapter.isAvailable()) {
        entry = await this.redisAdapter.get<T>(key)
        
        if (entry) {
          // Promote to memory cache
          await this.memoryAdapter.set(key, entry)
        }
      }
      
      // Try persistent storage if not in Redis
      if (!entry && this.persistAdapter && options.persist !== false) {
        entry = await this.persistAdapter.get<T>(key)
        
        if (entry) {
          // Promote to memory cache
          await this.memoryAdapter.set(key, entry)
          // Also promote to Redis if available
          if (this.redisAdapter && this.redisAdapter.isAvailable()) {
            await this.redisAdapter.set(key, entry)
          }
        }
      }

      if (!entry) {
        this.stats.misses++
        this.emit('miss', { key })
        return null
      }

      const now = Date.now()
      const isExpired = entry.metadata.expiresAt < now
      const isStale = options.staleWhileRevalidate 
        ? entry.metadata.expiresAt + options.staleWhileRevalidate < now
        : isExpired

      if (isExpired && !options.staleWhileRevalidate) {
        // Expired and no stale-while-revalidate
        await this.delete(key)
        this.stats.misses++
        this.emit('miss', { key })
        return null
      }

      if (isStale) {
        // Serve stale content but trigger revalidation
        this.stats.staleHits++
        this.emit('stale-hit', { key })
        this.triggerRevalidation(key, entry)
      } else {
        this.stats.hits++
        this.emit('hit', { key })
      }

      return entry.data
    } catch (error) {
      this.stats.errors++
      this.emit('error', { key, error })
      console.error('Cache get error:', error)
      return null
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const endpoint = extractEndpoint(key)
      const strategy = selectStrategy(endpoint, data)
      
      const ttl = options.ttl || strategy.getTTL(data)
      const now = Date.now()
      
      const metadata: CacheMetadata = {
        source: 'api',
        timestamp: now,
        expiresAt: now + ttl,
        version: '1.0',
        hitCount: 0,
        lastAccessed: now,
      }

      const entry: CacheEntry<T> = {
        key,
        data,
        metadata,
      }

      // Store in memory cache
      await this.memoryAdapter.set(key, entry)

      // Store in Redis if available
      if (this.redisAdapter && this.redisAdapter.isAvailable()) {
        await this.redisAdapter.set(key, entry)
      }

      // Store in persistent cache if enabled
      if (this.persistAdapter && options.persist !== false) {
        await this.persistAdapter.set(key, entry)
      }

      this.emit('set', { key })
    } catch (error) {
      this.stats.errors++
      this.emit('error', { key, error })
      console.error('Cache set error:', error)
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const memoryDeleted = await this.memoryAdapter.delete(key)
      let redisDeleted = false
      let persistDeleted = false
      
      if (this.redisAdapter && this.redisAdapter.isAvailable()) {
        redisDeleted = await this.redisAdapter.delete(key)
      }
      
      if (this.persistAdapter) {
        persistDeleted = await this.persistAdapter.delete(key)
      }

      if (memoryDeleted || redisDeleted || persistDeleted) {
        this.emit('delete', { key })
        return true
      }
      
      return false
    } catch (error) {
      this.stats.errors++
      this.emit('error', { key, error })
      console.error('Cache delete error:', error)
      return false
    }
  }

  async clear(pattern?: string): Promise<number> {
    try {
      const memoryCleared = await this.memoryAdapter.clear(pattern)
      let redisCleared = 0
      let persistCleared = 0
      
      if (this.redisAdapter && this.redisAdapter.isAvailable()) {
        redisCleared = await this.redisAdapter.clear(pattern)
      }
      
      if (this.persistAdapter) {
        persistCleared = await this.persistAdapter.clear(pattern)
      }

      const total = memoryCleared + redisCleared + persistCleared
      this.emit('clear', { pattern, count: total })
      return total
    } catch (error) {
      this.stats.errors++
      this.emit('error', { error })
      console.error('Cache clear error:', error)
      return 0
    }
  }

  async has(key: string): Promise<boolean> {
    const memoryKeys = await this.memoryAdapter.keys()
    if (memoryKeys.includes(key)) return true

    if (this.redisAdapter && this.redisAdapter.isAvailable()) {
      const redisKeys = await this.redisAdapter.keys()
      if (redisKeys.includes(key)) return true
    }

    if (this.persistAdapter) {
      const persistKeys = await this.persistAdapter.keys()
      return persistKeys.includes(key)
    }

    return false
  }

  async getStats(): Promise<CacheStats> {
    const memorySize = await this.memoryAdapter.size()
    const redisSize = this.redisAdapter && this.redisAdapter.isAvailable() 
      ? await this.redisAdapter.size() : 0
    const persistSize = this.persistAdapter ? await this.persistAdapter.size() : 0
    
    const memoryKeys = await this.memoryAdapter.keys()
    const redisKeys = this.redisAdapter && this.redisAdapter.isAvailable() 
      ? await this.redisAdapter.keys() : []
    const persistKeys = this.persistAdapter ? await this.persistAdapter.keys() : []
    
    return {
      ...this.stats,
      size: memorySize + redisSize + persistSize,
      entries: new Set([...memoryKeys, ...redisKeys, ...persistKeys]).size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    }
  }

  async resetStats(): Promise<void> {
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      errors: 0,
      size: 0,
      entries: 0,
      lastReset: Date.now(),
    }
  }

  async warmup(keys: string[]): Promise<void> {
    for (const key of keys) {
      let entry = null
      
      // Try Redis first
      if (this.redisAdapter && this.redisAdapter.isAvailable()) {
        entry = await this.redisAdapter.get(key)
      }
      
      // Fall back to persistent storage
      if (!entry && this.persistAdapter) {
        entry = await this.persistAdapter.get(key)
      }
      
      // Warm up memory cache
      if (entry && entry.metadata.expiresAt > Date.now()) {
        await this.memoryAdapter.set(key, entry)
      }
    }
  }

  async prune(): Promise<number> {
    let pruned = 0

    // Prune expired entries from memory
    const memoryKeys = await this.memoryAdapter.keys()
    const now = Date.now()

    for (const key of memoryKeys) {
      const entry = await this.memoryAdapter.get(key)
      if (entry && entry.metadata.expiresAt < now) {
        await this.memoryAdapter.delete(key)
        pruned++
      }
    }

    // Prune from persistent storage
    if (this.persistAdapter && 'pruneExpired' in this.persistAdapter) {
      pruned += await this.persistAdapter.pruneExpired()
    }

    if (pruned > 0) {
      this.emit('evict', { count: pruned })
    }

    return pruned
  }

  private startPruning(): void {
    // Prune every 5 minutes
    this.pruneInterval = setInterval(() => {
      this.prune().catch(console.error)
    }, 5 * 60 * 1000)
  }

  private emit(type: CacheEventType, metadata?: Record<string, any>): void {
    const event: CacheEvent = {
      type,
      timestamp: Date.now(),
      metadata,
    }
    this.eventBus.emit(`cache:${type}`, event)
  }

  private async triggerRevalidation(key: string, entry: CacheEntry<any>): Promise<void> {
    // In a real implementation, this would trigger a background fetch
    // For now, we just emit an event that can be handled by the application
    this.emit('revalidate', { key, entry })
  }

  destroy(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval)
    }
  }

  // Subscribe to cache events
  on(event: CacheEventType, handler: (event: CacheEvent) => void): () => void {
    return this.eventBus.on(`cache:${event}`, handler)
  }
}
// Unified cache types for the application

export interface CacheEntry<T> {
  key: string
  data: T
  metadata: CacheMetadata
}

export interface CacheMetadata {
  source: 'server' | 'api' | 'cache' | 'prefetch'
  timestamp: number
  expiresAt: number
  etag?: string
  version?: string
  size?: number
  hitCount?: number
  lastAccessed?: number
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: number // Time in ms to serve stale content while revalidating
  priority?: 'low' | 'normal' | 'high'
  persist?: boolean // Whether to persist to IndexedDB
  prefetch?: boolean // Whether this entry should be prefetched
  compression?: boolean // Whether to compress large data
}

export interface CacheStrategy {
  name: string
  shouldCache: (response: any) => boolean
  getTTL: (response: any) => number
  getCacheKey: (request: CacheKeyParams) => string
  shouldRevalidate?: (entry: CacheEntry<any>) => boolean
}

export interface CacheKeyParams {
  endpoint: string
  params?: Record<string, any>
  version?: string
}

export interface CacheStats {
  hits: number
  misses: number
  staleHits: number
  errors: number
  size: number
  entries: number
  lastReset: number
  hitRate?: number
  avgResponseTime?: number
}

export interface CacheManager {
  get<T>(key: string, options?: CacheOptions): Promise<T | null>
  set<T>(key: string, data: T, options?: CacheOptions): Promise<void>
  delete(key: string): Promise<boolean>
  clear(pattern?: string): Promise<number>
  has(key: string): Promise<boolean>
  getStats(): Promise<CacheStats>
  resetStats(): Promise<void>
  warmup(keys: string[]): Promise<void>
  prune(): Promise<number>
}

export interface StorageAdapter {
  get<T>(key: string): Promise<CacheEntry<T> | null>
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>
  delete(key: string): Promise<boolean>
  clear(pattern?: string): Promise<number>
  keys(pattern?: string): Promise<string[]>
  size(): Promise<number>
}

export type CacheEventType = 
  | 'hit'
  | 'miss'
  | 'stale-hit'
  | 'set'
  | 'delete'
  | 'clear'
  | 'error'
  | 'evict'
  | 'revalidate'

export interface CacheEvent {
  type: CacheEventType
  key?: string
  timestamp: number
  metadata?: Record<string, any>
}

export interface CacheConfig {
  defaultTTL: number
  maxSize: number // Maximum cache size in bytes
  maxEntries: number // Maximum number of entries
  enableCompression: boolean
  enablePersistence: boolean
  enablePrefetch: boolean
  evictionPolicy: 'lru' | 'lfu' | 'fifo' | 'ttl'
  revalidationInterval?: number
  compressionThreshold?: number // Size in bytes above which to compress
}
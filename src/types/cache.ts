// Cache-related type definitions

export interface CacheConfig {
  ttl: number // Time to live in seconds
  prefix?: string // Optional key prefix for namespacing
}

export interface CacheItem<T> {
  data: T
  source: 'cache' | 'api'
  fetchedAt: number // Unix timestamp in milliseconds
  expiresAt: number // Unix timestamp in milliseconds
}

export interface CacheStats {
  hits: number
  misses: number
  errors: number
  lastReset: number
}

export interface AirportCacheKey {
  type: 'iata' | 'icao'
  code: string
}

export interface CacheService<T> {
  get(key: string): Promise<CacheItem<T> | null>
  set(key: string, data: T, ttl?: number): Promise<void>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  clear(pattern?: string): Promise<number>
  getStats(): Promise<CacheStats>
}
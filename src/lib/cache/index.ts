// Main cache module exports

export * from './types'
export { CacheManager } from './CacheManager'
export { strategies, selectStrategy } from './strategies'
export { generateCacheKey, parseCacheKey, matchPattern } from './utils/cacheKey'
export { compress, decompress, estimateSize } from './utils/compression'

// Create and export singleton cache instance
import { CacheManager } from './CacheManager'

let cacheInstance: CacheManager | null = null
let initPromise: Promise<CacheManager> | null = null

export async function getCache(): Promise<CacheManager> {
  if (cacheInstance) return cacheInstance
  
  if (!initPromise) {
    initPromise = initializeCache()
  }
  
  return initPromise
}

async function initializeCache(): Promise<CacheManager> {
  // Initialize Redis client if running on server
  let redisClient = null
  if (typeof window === 'undefined') {
    try {
      const { getRedisClient } = await import('@/server/services/redisClient')
      redisClient = await getRedisClient()
    } catch (error) {
      console.warn('Failed to initialize Redis for cache manager:', error)
    }
  }
  
  cacheInstance = new CacheManager({
    maxEntries: 2000,
    maxSize: 100 * 1024 * 1024, // 100MB
    enablePersistence: true,
    enableCompression: true,
    compressionThreshold: 5 * 1024, // 5KB
  }, redisClient)
  
  return cacheInstance
}

// Synchronous getter for backward compatibility
export function getCacheSync(): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager({
      maxEntries: 2000,
      maxSize: 100 * 1024 * 1024, // 100MB
      enablePersistence: true,
      enableCompression: true,
      compressionThreshold: 5 * 1024, // 5KB
    })
  }
  return cacheInstance
}

// Helper to clear all caches
export async function clearAllCaches(): Promise<void> {
  const cache = await getCache()
  await cache.clear()
  await cache.resetStats()
}
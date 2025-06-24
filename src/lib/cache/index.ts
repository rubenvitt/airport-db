// Main cache module exports

export * from './types'
export { CacheManager } from './CacheManager'
export { strategies, selectStrategy } from './strategies'
export { generateCacheKey, parseCacheKey, matchPattern } from './utils/cacheKey'
export { compress, decompress, estimateSize } from './utils/compression'

// Create and export singleton cache instance
import { CacheManager } from './CacheManager'

let cacheInstance: CacheManager | null = null

export function getCache(): CacheManager {
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
  const cache = getCache()
  await cache.clear()
  await cache.resetStats()
}
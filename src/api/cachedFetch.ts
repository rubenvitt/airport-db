// Cached fetch wrapper that integrates with the cache manager

import { fetchApi, type FetchOptions } from './base'
import { getCache, getCacheSync, generateCacheKey, selectStrategy, type CacheOptions } from '@/lib/cache'
import { extractEndpoint } from '@/lib/cache/utils/cacheKey'

export interface CachedFetchOptions extends FetchOptions {
  cache?: CacheOptions | false
  cacheKey?: string
  revalidate?: boolean
  onCacheHit?: (data: any) => void
  onCacheMiss?: () => void
}

export async function cachedFetch<T>(
  url: string,
  options: CachedFetchOptions = {}
): Promise<T> {
  const { 
    cache = {}, 
    cacheKey,
    revalidate = false,
    onCacheHit,
    onCacheMiss,
    ...fetchOptions 
  } = options

  // If caching is explicitly disabled
  if (cache === false) {
    return fetchApi<T>(url, fetchOptions)
  }

  const cacheManager = await getCache()
  const endpoint = extractEndpoint(url)
  
  // Generate cache key
  const key = cacheKey || generateCacheKey({
    endpoint,
    params: fetchOptions.params,
    version: 'v1'
  })

  // Try to get from cache first
  if (!revalidate) {
    const cachedData = await cacheManager.get<T>(key, {
      ...cache,
      staleWhileRevalidate: cache.staleWhileRevalidate || 30000, // 30s default
    })

    if (cachedData !== null) {
      onCacheHit?.(cachedData)
      
      // Check if we should revalidate in background
      const strategy = selectStrategy(endpoint, cachedData)
      const entry = await cacheManager.has(key)
      
      if (entry) {
        // Background revalidation if needed
        cachedFetch(url, { ...options, revalidate: true }).catch(console.error)
      }
      
      return cachedData
    }
  }

  // Cache miss or revalidation
  onCacheMiss?.()
  
  try {
    // Fetch fresh data
    const data = await fetchApi<T>(url, fetchOptions)
    
    // Store in cache
    const strategy = selectStrategy(endpoint, data)
    if (strategy.shouldCache(data)) {
      await cacheManager.set(key, data, {
        ttl: cache.ttl || strategy.getTTL(data),
        persist: cache.persist !== false,
        priority: cache.priority || 'normal',
        ...cache
      })
    }

    return data
  } catch (error) {
    // If fetch fails and we have stale data, return it
    if (!revalidate) {
      const staleData = await cacheManager.get<T>(key, {
        ...cache,
        staleWhileRevalidate: Infinity, // Accept any stale data
      })
      
      if (staleData !== null) {
        console.warn('Serving stale data due to fetch error:', error)
        return staleData
      }
    }
    
    throw error
  }
}

// Prefetch data into cache
export async function prefetch(
  url: string,
  options: CachedFetchOptions = {}
): Promise<void> {
  try {
    await cachedFetch(url, {
      ...options,
      cache: {
        ...((typeof options.cache === 'object' && options.cache) || {}),
        prefetch: true,
      }
    })
  } catch (error) {
    console.error('Prefetch failed:', error)
  }
}

// Invalidate cache entries
export async function invalidateCache(pattern?: string): Promise<number> {
  const cache = await getCache()
  return cache.clear(pattern)
}

// Get cache statistics
export async function getCacheStats() {
  const cache = await getCache()
  return cache.getStats()
}
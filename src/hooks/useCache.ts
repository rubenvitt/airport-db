// React hook for cache management and monitoring

import { useState, useEffect, useCallback } from 'react'
import { getCache, type CacheStats, type CacheEvent } from '@/lib/cache'
import { getCacheStats, invalidateCache, prefetch } from '@/api/cachedFetch'

export interface UseCacheOptions {
  autoRefreshStats?: boolean
  refreshInterval?: number
}

export function useCache(options: UseCacheOptions = {}) {
  const { autoRefreshStats = true, refreshInterval = 5000 } = options
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const cache = getCache()

  // Fetch cache statistics
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await getCacheStats()
      setStats(newStats)
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    }
  }, [])

  // Clear cache
  const clearCache = useCallback(async (pattern?: string) => {
    setIsLoading(true)
    try {
      const cleared = await invalidateCache(pattern)
      await refreshStats()
      return cleared
    } finally {
      setIsLoading(false)
    }
  }, [refreshStats])

  // Prefetch data
  const prefetchData = useCallback(async (urls: string[]) => {
    setIsLoading(true)
    try {
      await Promise.all(urls.map(url => prefetch(url)))
      await refreshStats()
    } finally {
      setIsLoading(false)
    }
  }, [refreshStats])

  // Warmup cache from IndexedDB
  const warmupCache = useCallback(async (keys: string[]) => {
    setIsLoading(true)
    try {
      await cache.warmup(keys)
      await refreshStats()
    } finally {
      setIsLoading(false)
    }
  }, [cache, refreshStats])

  // Subscribe to cache events
  useEffect(() => {
    const unsubscribers: Array<() => void> = []

    // Update stats on cache events
    const events: Array<'hit' | 'miss' | 'set' | 'delete' | 'clear'> = [
      'hit', 'miss', 'set', 'delete', 'clear'
    ]

    events.forEach(event => {
      const unsubscribe = cache.on(event, () => {
        // Debounce stats refresh
        setTimeout(refreshStats, 100)
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [cache, refreshStats])

  // Auto-refresh stats
  useEffect(() => {
    if (!autoRefreshStats) return

    refreshStats()
    const interval = setInterval(refreshStats, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefreshStats, refreshInterval, refreshStats])

  return {
    stats,
    isLoading,
    clearCache,
    prefetchData,
    warmupCache,
    refreshStats,
  }
}

// Hook to monitor specific cache keys
export function useCacheEntry<T>(key: string) {
  const [data, setData] = useState<T | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const cache = getCache()

  const checkEntry = useCallback(async () => {
    try {
      const entry = await cache.get<T>(key)
      if (entry !== null) {
        setData(entry)
        setLastUpdated(Date.now())
        
        // Check if stale
        const cacheEntry = await cache.has(key)
        setIsStale(false) // Will be updated by stale-hit event
      } else {
        setData(null)
        setIsStale(false)
        setLastUpdated(null)
      }
    } catch (error) {
      console.error('Failed to check cache entry:', error)
    }
  }, [cache, key])

  useEffect(() => {
    checkEntry()

    // Subscribe to events for this key
    const handleEvent = (event: CacheEvent) => {
      if (event.key === key) {
        checkEntry()
      }
    }

    const handleStaleHit = (event: CacheEvent) => {
      if (event.key === key) {
        setIsStale(true)
      }
    }

    const unsubscribers = [
      cache.on('set', handleEvent),
      cache.on('delete', handleEvent),
      cache.on('stale-hit', handleStaleHit),
    ]

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [cache, key, checkEntry])

  return {
    data,
    isStale,
    lastUpdated,
    refresh: checkEntry,
  }
}
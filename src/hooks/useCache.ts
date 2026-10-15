// React hook for cache management and monitoring

import { useState, useEffect, useCallback } from 'react'

export interface CacheStats {
  hitRate: number
  hits: number
  misses: number
  staleHits: number
  errors: number
  entries: number
  size: number
  lastReset: string
  avgResponseTime: number | null
}

export interface UseCacheOptions {
  autoRefreshStats?: boolean
  refreshInterval?: number
}

export function useCache(options: UseCacheOptions = {}) {
  const { autoRefreshStats = true, refreshInterval = 5000 } = options
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch cache statistics from backend API
  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch('/api/cache/stats')
      if (response.ok) {
        const newStats = await response.json()
        setStats(newStats)
      }
    } catch (error) {
      console.error('Failed to fetch cache stats:', error)
    }
  }, [])

  // Clear cache via backend API
  const clearCache = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/cache/stats', { method: 'DELETE' })
      if (response.ok) {
        const result = await response.json()
        await refreshStats()
        return result.cleared
      }
      return 0
    } finally {
      setIsLoading(false)
    }
  }, [refreshStats])

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
    refreshStats,
  }
}

// Hook to monitor specific cache keys
export function useCacheEntry<T>(key: string) {
  const [data, setData] = useState<T | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const cache = getCacheSync()

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
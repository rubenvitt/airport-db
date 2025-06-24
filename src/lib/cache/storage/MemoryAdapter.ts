// In-memory storage adapter for fast access

import type { StorageAdapter, CacheEntry } from '../types'

export class MemoryAdapter implements StorageAdapter {
  private cache = new Map<string, CacheEntry<any>>()
  private accessOrder: string[] = []
  private maxEntries: number

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Update access order for LRU
    this.updateAccessOrder(key)

    // Update metadata
    entry.metadata.lastAccessed = Date.now()
    entry.metadata.hitCount = (entry.metadata.hitCount || 0) + 1

    return entry
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Check if we need to evict entries
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      this.evictLRU()
    }

    // Update metadata
    entry.metadata.lastAccessed = Date.now()
    entry.metadata.size = entry.metadata.size || JSON.stringify(entry.data).length

    this.cache.set(key, entry)
    this.updateAccessOrder(key)
  }

  async delete(key: string): Promise<boolean> {
    const existed = this.cache.has(key)
    this.cache.delete(key)
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    return existed
  }

  async clear(pattern?: string): Promise<number> {
    if (!pattern) {
      const count = this.cache.size
      this.cache.clear()
      this.accessOrder = []
      return count
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const keysToDelete: string[] = []
    let deleted = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      if (await this.delete(key)) {
        deleted++
      }
    }

    return deleted
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys())
    
    if (!pattern) return allKeys

    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return allKeys.filter(key => regex.test(key))
  }

  async size(): Promise<number> {
    let totalSize = 0
    for (const entry of this.cache.values()) {
      totalSize += entry.metadata.size || 0
    }
    return totalSize
  }

  private updateAccessOrder(key: string): void {
    this.accessOrder = this.accessOrder.filter(k => k !== key)
    this.accessOrder.push(key)
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return
    
    const lruKey = this.accessOrder[0]
    this.cache.delete(lruKey)
    this.accessOrder.shift()
  }

  async pruneExpired(): Promise<number> {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.expiresAt < now) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key)
    }

    return keysToDelete.length
  }

  getStats() {
    const entries = Array.from(this.cache.values())
    const now = Date.now()

    return {
      entries: this.cache.size,
      totalSize: entries.reduce((sum, e) => sum + (e.metadata.size || 0), 0),
      expired: entries.filter(e => e.metadata.expiresAt < now).length,
      avgHitCount: entries.reduce((sum, e) => sum + (e.metadata.hitCount || 0), 0) / entries.length || 0,
      oldestEntry: Math.min(...entries.map(e => e.metadata.timestamp)) || 0,
      newestEntry: Math.max(...entries.map(e => e.metadata.timestamp)) || 0,
    }
  }
}
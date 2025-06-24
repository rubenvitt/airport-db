// IndexedDB storage adapter for persistent caching

import type { StorageAdapter, CacheEntry } from '../types'
import { compress, decompress } from '../utils/compression'

const DB_NAME = 'AirportDBCache'
const DB_VERSION = 1
const STORE_NAME = 'cache'

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  private compressionThreshold: number

  constructor(compressionThreshold = 1024 * 10) { // 10KB default
    this.compressionThreshold = compressionThreshold
  }

  private async init(): Promise<void> {
    if (this.db) return
    if (this.initPromise) return this.initPromise

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
          store.createIndex('expiresAt', 'metadata.expiresAt', { unique: false })
          store.createIndex('lastAccessed', 'metadata.lastAccessed', { unique: false })
          store.createIndex('source', 'metadata.source', { unique: false })
        }
      }
    })

    return this.initPromise
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    await this.init()
    if (!this.db) return null

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = async () => {
        const entry = request.result
        if (!entry) {
          resolve(null)
          return
        }

        // Check if data is compressed
        if (entry.compressed) {
          try {
            entry.data = await decompress(entry.data)
          } catch (error) {
            console.error('Failed to decompress cache entry:', error)
            resolve(null)
            return
          }
        }

        // Update last accessed time
        this.updateLastAccessed(key)

        resolve(entry)
      }

      request.onerror = () => {
        reject(new Error('Failed to get cache entry'))
      }
    })
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('IndexedDB not initialized')

    // Check if we should compress the data
    const dataStr = JSON.stringify(entry.data)
    const shouldCompress = dataStr.length > this.compressionThreshold
    let finalData = entry.data
    let compressed = false

    if (shouldCompress) {
      try {
        finalData = await compress(dataStr) as any
        compressed = true
      } catch (error) {
        console.warn('Failed to compress data, storing uncompressed:', error)
      }
    }

    const storedEntry = {
      ...entry,
      data: finalData,
      compressed,
      metadata: {
        ...entry.metadata,
        size: dataStr.length,
        lastAccessed: Date.now()
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(storedEntry)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error('Failed to set cache entry'))
    })
  }

  async delete(key: string): Promise<boolean> {
    await this.init()
    if (!this.db) return false

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(new Error('Failed to delete cache entry'))
    })
  }

  async clear(pattern?: string): Promise<number> {
    await this.init()
    if (!this.db) return 0

    if (!pattern) {
      // Clear all entries
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const countRequest = store.count()
        
        countRequest.onsuccess = () => {
          const count = countRequest.result
          const clearRequest = store.clear()
          
          clearRequest.onsuccess = () => resolve(count)
          clearRequest.onerror = () => reject(new Error('Failed to clear cache'))
        }
      })
    }

    // Clear entries matching pattern
    const keys = await this.keys(pattern)
    let deleted = 0

    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++
      }
    }

    return deleted
  }

  async keys(pattern?: string): Promise<string[]> {
    await this.init()
    if (!this.db) return []

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAllKeys()

      request.onsuccess = () => {
        let keys = request.result as string[]
        
        if (pattern) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'))
          keys = keys.filter(key => regex.test(key))
        }

        resolve(keys)
      }

      request.onerror = () => reject(new Error('Failed to get cache keys'))
    })
  }

  async size(): Promise<number> {
    await this.init()
    if (!this.db) return 0

    // Estimate storage usage
    if ('estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        return estimate.usage || 0
      } catch (error) {
        console.warn('Failed to estimate storage:', error)
      }
    }

    // Fallback: count entries and estimate size
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const entries = request.result
        const totalSize = entries.reduce((sum, entry) => {
          return sum + (entry.metadata?.size || JSON.stringify(entry).length)
        }, 0)
        resolve(totalSize)
      }

      request.onerror = () => reject(new Error('Failed to calculate cache size'))
    })
  }

  private async updateLastAccessed(key: string): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(key)

    request.onsuccess = () => {
      const entry = request.result
      if (entry) {
        entry.metadata.lastAccessed = Date.now()
        entry.metadata.hitCount = (entry.metadata.hitCount || 0) + 1
        store.put(entry)
      }
    }
  }

  async pruneExpired(): Promise<number> {
    await this.init()
    if (!this.db) return 0

    const now = Date.now()
    let deleted = 0

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const index = store.index('expiresAt')
      const range = IDBKeyRange.upperBound(now)
      const request = index.openCursor(range)

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          store.delete(cursor.primaryKey)
          deleted++
          cursor.continue()
        } else {
          resolve(deleted)
        }
      }

      request.onerror = () => reject(new Error('Failed to prune expired entries'))
    })
  }
}
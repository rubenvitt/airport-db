// Redis storage adapter for server-side caching
// This adapter is used when running in a server environment with Redis available

import type { StorageAdapter, CacheEntry } from '../types'
import type { Redis } from 'ioredis'
import { compress, decompress } from '../utils/compression'

export class RedisAdapter implements StorageAdapter {
  private redis: Redis | null = null
  private prefix = 'cache:'
  private compressionThreshold: number
  private isServer: boolean

  constructor(
    redisClient: Redis | null,
    compressionThreshold = 5 * 1024 // 5KB
  ) {
    this.redis = redisClient
    this.compressionThreshold = compressionThreshold
    this.isServer = typeof window === 'undefined'
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.redis || !this.isServer) return null

    try {
      const redisKey = this.prefix + key
      const data = await this.redis.get(redisKey)
      
      if (!data) return null

      const parsed = JSON.parse(data)
      
      // Handle compressed data
      if (parsed.compressed) {
        const decompressed = await decompress(parsed.data)
        parsed.data = JSON.parse(decompressed)
        delete parsed.compressed
      }

      return parsed as CacheEntry<T>
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.redis || !this.isServer) return

    try {
      const redisKey = this.prefix + key
      const ttl = Math.max(0, Math.floor((entry.metadata.expiresAt - Date.now()) / 1000))
      
      if (ttl <= 0) return // Don't store already expired entries

      // Compress large data
      const dataStr = JSON.stringify(entry.data)
      let storageEntry: any = { ...entry }

      if (dataStr.length > this.compressionThreshold) {
        const compressed = await compress(dataStr)
        storageEntry = {
          ...entry,
          data: compressed,
          compressed: true,
        }
      }

      await this.redis.setex(redisKey, ttl, JSON.stringify(storageEntry))
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redis || !this.isServer) return false

    try {
      const redisKey = this.prefix + key
      const result = await this.redis.del(redisKey)
      return result === 1
    } catch (error) {
      console.error('Redis delete error:', error)
      return false
    }
  }

  async clear(pattern?: string): Promise<number> {
    if (!this.redis || !this.isServer) return 0

    try {
      const searchPattern = pattern 
        ? `${this.prefix}${pattern}*` 
        : `${this.prefix}*`
      
      // Use SCAN for better performance with large datasets
      const keys: string[] = []
      const stream = this.redis.scanStream({
        match: searchPattern,
        count: 100
      })

      return new Promise((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys)
        })

        stream.on('end', async () => {
          if (keys.length === 0) {
            resolve(0)
            return
          }

          try {
            const result = await this.redis!.del(...keys)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    } catch (error) {
      console.error('Redis clear error:', error)
      return 0
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!this.redis || !this.isServer) return []

    try {
      const searchPattern = pattern 
        ? `${this.prefix}${pattern}*` 
        : `${this.prefix}*`
      
      const keys: string[] = []
      const stream = this.redis.scanStream({
        match: searchPattern,
        count: 100
      })

      return new Promise((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          // Remove prefix from keys
          const cleanKeys = resultKeys.map(k => k.replace(this.prefix, ''))
          keys.push(...cleanKeys)
        })

        stream.on('end', () => resolve(keys))
        stream.on('error', reject)
      })
    } catch (error) {
      console.error('Redis keys error:', error)
      return []
    }
  }

  async size(): Promise<number> {
    if (!this.redis || !this.isServer) return 0

    try {
      // Get memory usage for our cache keys
      const keys = await this.keys()
      let totalSize = 0

      // Batch process keys to avoid overloading Redis
      const batchSize = 100
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const pipeline = this.redis.pipeline()
        
        batch.forEach(key => {
          pipeline.memory('USAGE', this.prefix + key)
        })

        const results = await pipeline.exec()
        if (results) {
          results.forEach(([err, size]) => {
            if (!err && typeof size === 'number') {
              totalSize += size
            }
          })
        }
      }

      return totalSize
    } catch (error) {
      console.error('Redis size error:', error)
      return 0
    }
  }

  async pruneExpired(): Promise<number> {
    // Redis automatically removes expired keys, so we don't need to prune manually
    return 0
  }

  isAvailable(): boolean {
    return this.isServer && this.redis !== null && this.redis.status === 'ready'
  }
}
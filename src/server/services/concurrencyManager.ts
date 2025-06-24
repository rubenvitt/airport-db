// Concurrency control for preventing duplicate API requests

import type { Redis } from 'ioredis'
import { getRedisClient } from './redisClient'

export interface LockOptions {
  ttl?: number // Lock TTL in seconds (default: 10)
  retries?: number // Number of retries (default: 3)
  retryDelay?: number // Delay between retries in ms (default: 100)
}

export class ConcurrencyManager {
  private redis: Redis | null = null
  private localLocks = new Map<string, Promise<any>>()

  async initialize(): Promise<void> {
    this.redis = await getRedisClient()
  }

  /**
   * Acquire a distributed lock using Redis SETNX
   */
  async acquireLock(
    key: string,
    options: LockOptions = {}
  ): Promise<{ acquired: boolean; token: string }> {
    const { ttl = 10, retries = 3, retryDelay = 100 } = options
    const lockKey = `lock:${key}`
    const token = `${Date.now()}-${Math.random()}`

    // If Redis is not available, use local locks
    if (!this.redis) {
      return this.acquireLocalLock(key, token)
    }

    for (let i = 0; i <= retries; i++) {
      try {
        // Try to set the lock with NX (only if not exists) and EX (expiry)
        const result = await this.redis.set(lockKey, token, 'NX', 'EX', ttl)
        
        if (result === 'OK') {
          return { acquired: true, token }
        }

        // If not the last retry, wait before trying again
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      } catch (error) {
        console.error('Error acquiring lock:', error)
        // Fall back to local lock on Redis error
        return this.acquireLocalLock(key, token)
      }
    }

    return { acquired: false, token: '' }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:${key}`

    if (!this.redis) {
      return this.releaseLocalLock(key)
    }

    try {
      // Lua script to ensure we only delete our own lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `

      const result = await this.redis.eval(script, 1, lockKey, token) as number
      return result === 1
    } catch (error) {
      console.error('Error releasing lock:', error)
      return this.releaseLocalLock(key)
    }
  }

  /**
   * Execute a function with distributed locking
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const { acquired, token } = await this.acquireLock(key, options)

    if (!acquired) {
      throw new Error(`Failed to acquire lock for key: ${key}`)
    }

    try {
      return await fn()
    } finally {
      await this.releaseLock(key, token)
    }
  }

  /**
   * Wait for an existing operation or start a new one
   * This prevents duplicate operations for the same key
   */
  async deduplicateOperation<T>(
    key: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const operationKey = `operation:${key}`

    // Check if there's already an operation in progress locally
    const existingOperation = this.localLocks.get(operationKey)
    if (existingOperation) {
      return existingOperation
    }

    // Start a new operation with locking
    const operation = this.withLock(key, fn, options)
      .finally(() => {
        // Clean up local lock after operation completes
        this.localLocks.delete(operationKey)
      })

    // Store the operation promise locally
    this.localLocks.set(operationKey, operation)

    return operation
  }

  /**
   * Local lock fallback when Redis is not available
   */
  private acquireLocalLock(key: string, token: string): { acquired: boolean; token: string } {
    const lockKey = `lock:${key}`
    
    if (this.localLocks.has(lockKey)) {
      return { acquired: false, token: '' }
    }

    this.localLocks.set(lockKey, Promise.resolve(token))
    return { acquired: true, token }
  }

  /**
   * Release local lock
   */
  private releaseLocalLock(key: string): boolean {
    const lockKey = `lock:${key}`
    return this.localLocks.delete(lockKey)
  }
}

// Export singleton instance
export const concurrencyManager = new ConcurrencyManager()
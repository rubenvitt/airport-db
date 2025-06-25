import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConcurrencyManager } from '../concurrencyManager'
import { getRedisClient } from '../redisClient'
import Redis from 'ioredis'

// Mock Redis client
vi.mock('../redisClient')

describe('ConcurrencyManager', () => {
  let concurrencyManager: ConcurrencyManager
  let mockRedisClient: any

  beforeEach(() => {
    // Setup mock Redis client
    mockRedisClient = {
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
      eval: vi.fn(),
      status: 'ready'
    }
    
    ;(getRedisClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockRedisClient)
    
    concurrencyManager = new ConcurrencyManager()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Distributed Locking', () => {
    it('should acquire lock successfully', async () => {
      mockRedisClient.set.mockResolvedValue('OK')
      
      const lockAcquired = await concurrencyManager.acquireLock('test-resource', 5000)
      
      expect(lockAcquired).toBe(true)
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'lock:test-resource',
        expect.any(String),
        'PX',
        5000,
        'NX'
      )
    })

    it('should fail to acquire lock when already locked', async () => {
      mockRedisClient.set.mockResolvedValue(null)
      
      const lockAcquired = await concurrencyManager.acquireLock('test-resource', 5000)
      
      expect(lockAcquired).toBe(false)
    })

    it('should release lock successfully', async () => {
      const lockId = 'test-lock-id'
      mockRedisClient.eval.mockResolvedValue(1)
      
      const released = await concurrencyManager.releaseLock('test-resource', lockId)
      
      expect(released).toBe(true)
      expect(mockRedisClient.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1])'),
        1,
        'lock:test-resource',
        lockId
      )
    })

    it('should not release lock with wrong ID', async () => {
      mockRedisClient.eval.mockResolvedValue(0)
      
      const released = await concurrencyManager.releaseLock('test-resource', 'wrong-id')
      
      expect(released).toBe(false)
    })
  })

  describe('Deduplication', () => {
    it('should deduplicate concurrent operations', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 100))
        return `result-${callCount}`
      }

      // Start multiple concurrent operations
      const promises = Array(5).fill(null).map(() => 
        concurrencyManager.deduplicateOperation('test-key', operation)
      )

      const results = await Promise.all(promises)

      // All should get the same result
      expect(callCount).toBe(1)
      results.forEach(result => {
        expect(result).toBe('result-1')
      })
    })

    it('should handle operation failures', async () => {
      const failingOperation = async () => {
        throw new Error('Operation failed')
      }

      const promise1 = concurrencyManager.deduplicateOperation('fail-key', failingOperation)
      const promise2 = concurrencyManager.deduplicateOperation('fail-key', failingOperation)

      // Both should receive the same error
      await expect(promise1).rejects.toThrow('Operation failed')
      await expect(promise2).rejects.toThrow('Operation failed')
    })

    it('should allow sequential operations after completion', async () => {
      let callCount = 0
      const operation = async () => {
        callCount++
        return `result-${callCount}`
      }

      // First operation
      const result1 = await concurrencyManager.deduplicateOperation('seq-key', operation)
      expect(result1).toBe('result-1')

      // Second operation (after first completes)
      const result2 = await concurrencyManager.deduplicateOperation('seq-key', operation)
      expect(result2).toBe('result-2')

      expect(callCount).toBe(2)
    })
  })

  describe('Retry Logic', () => {
    it('should retry operations on failure', async () => {
      let attempts = 0
      const retryableOperation = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      }

      const result = await concurrencyManager.withRetry(
        retryableOperation,
        3,
        100
      )

      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should fail after max retries', async () => {
      const alwaysFailOperation = async () => {
        throw new Error('Permanent failure')
      }

      await expect(
        concurrencyManager.withRetry(alwaysFailOperation, 3, 10)
      ).rejects.toThrow('Permanent failure')
    })

    it('should apply exponential backoff', async () => {
      const timestamps: number[] = []
      const operation = async () => {
        timestamps.push(Date.now())
        if (timestamps.length < 3) {
          throw new Error('Retry needed')
        }
        return 'success'
      }

      await concurrencyManager.withRetry(operation, 3, 50)

      // Check that delays increase
      const delay1 = timestamps[1] - timestamps[0]
      const delay2 = timestamps[2] - timestamps[1]
      
      expect(delay2).toBeGreaterThan(delay1)
    })
  })

  describe('Fallback to In-Process Mutex', () => {
    it('should use in-process mutex when Redis unavailable', async () => {
      ;(getRedisClient as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      
      const manager = new ConcurrencyManager()
      
      let callCount = 0
      const operation = async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'result'
      }

      // Should still deduplicate without Redis
      const promises = Array(3).fill(null).map(() =>
        manager.deduplicateOperation('fallback-key', operation)
      )

      const results = await Promise.all(promises)
      
      expect(callCount).toBe(1)
      results.forEach(result => {
        expect(result).toBe('result')
      })
    })
  })

  describe('Race Condition Prevention', () => {
    it('should handle rapid lock acquisition attempts', async () => {
      const lockPromises: Promise<boolean>[] = []
      
      // Simulate successful lock for first attempt only
      let firstCall = true
      mockRedisClient.set.mockImplementation(() => {
        if (firstCall) {
          firstCall = false
          return Promise.resolve('OK')
        }
        return Promise.resolve(null)
      })

      // Attempt to acquire lock 10 times concurrently
      for (let i = 0; i < 10; i++) {
        lockPromises.push(
          concurrencyManager.acquireLock('race-resource', 1000)
        )
      }

      const results = await Promise.all(lockPromises)
      
      // Only one should succeed
      const successCount = results.filter(r => r === true).length
      expect(successCount).toBe(1)
    })

    it('should handle concurrent deduplication with different keys', async () => {
      const operations: Record<string, number> = {
        key1: 0,
        key2: 0,
        key3: 0
      }

      const createOperation = (key: string) => async () => {
        operations[key]++
        await new Promise(resolve => setTimeout(resolve, 50))
        return `${key}-result`
      }

      // Run operations on different keys concurrently
      const promises = [
        concurrencyManager.deduplicateOperation('key1', createOperation('key1')),
        concurrencyManager.deduplicateOperation('key2', createOperation('key2')),
        concurrencyManager.deduplicateOperation('key3', createOperation('key3')),
        concurrencyManager.deduplicateOperation('key1', createOperation('key1')), // Duplicate
        concurrencyManager.deduplicateOperation('key2', createOperation('key2'))  // Duplicate
      ]

      const results = await Promise.all(promises)

      // Each unique key should be called once
      expect(operations.key1).toBe(1)
      expect(operations.key2).toBe(1)
      expect(operations.key3).toBe(1)

      // Results should be correct
      expect(results[0]).toBe('key1-result')
      expect(results[1]).toBe('key2-result')
      expect(results[2]).toBe('key3-result')
      expect(results[3]).toBe('key1-result') // Same as first
      expect(results[4]).toBe('key2-result') // Same as second
    })
  })
})
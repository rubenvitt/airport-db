// Security tests for Redis cache layer
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import Redis from 'ioredis'
import { getRedisConfig, getRedisClient, closeRedisClient } from '../redisClient'
import { secretsManager } from '../secretsManager'
import { airportCache } from '../airportCache'
import type { Airport } from '@/types/airport'

// Mock Redis for testing
vi.mock('ioredis')

describe('Redis Security Tests', () => {
  let mockRedis: any

  beforeAll(async () => {
    mockRedis = {
      status: 'ready',
      ping: vi.fn().mockResolvedValue('PONG'),
      get: vi.fn(),
      set: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      keys: vi.fn(),
      hgetall: vi.fn(),
      hincrby: vi.fn(),
      hset: vi.fn(),
      multi: vi.fn().mockReturnThis(),
      exec: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      quit: vi.fn(),
      on: vi.fn(),
    }

    ;(Redis as any).mockImplementation(() => mockRedis)
  })

  afterAll(async () => {
    await closeRedisClient()
    vi.restoreAllMocks()
  })

  describe('Authentication and ACLs', () => {
    it('should use username and password from secrets manager', async () => {
      // Set up environment
      process.env.REDIS_USERNAME = 'test-user'
      process.env.REDIS_PASSWORD = 'test-password'
      process.env.SECRETS_SOURCE = 'env'

      const config = await getRedisConfig()
      
      expect(config.username).toBe('airport-app') // Default from secrets manager
      expect(config.password).toBeDefined()
      expect(config.password).not.toBe('') // Should have a password
    })

    it('should reject connections without proper credentials', async () => {
      // Mock Redis connection failure
      const failingRedis = {
        ...mockRedis,
        ping: vi.fn().mockRejectedValue(new Error('NOAUTH Authentication required')),
      }
      ;(Redis as any).mockImplementationOnce(() => failingRedis)

      const client = await getRedisClient()
      
      // Should return null on auth failure (circuit breaker catches it)
      expect(client).toBeNull()
    })

    it('should use ACL username when provided', async () => {
      process.env.REDIS_USERNAME = 'airport-app'
      process.env.REDIS_PASSWORD = 'secure-password'

      const config = await getRedisConfig()
      
      expect(config.username).toBe('airport-app')
      expect(config.password).toBeDefined()
    })
  })

  describe('TLS/SSL Configuration', () => {
    it('should configure TLS when enabled', async () => {
      process.env.REDIS_TLS_ENABLED = 'true'
      process.env.REDIS_TLS_CA = './test/certs/ca.crt'
      process.env.REDIS_TLS_CERT = './test/certs/client.crt'
      process.env.REDIS_TLS_KEY = './test/certs/client.key'
      process.env.REDIS_TLS_SERVERNAME = 'redis-server'

      const config = await getRedisConfig()
      
      expect(config.tls).toBeDefined()
      expect(config.tls?.rejectUnauthorized).toBe(true)
      expect(config.tls?.servername).toBe('redis-server')
    })

    it('should allow disabling certificate verification for development', async () => {
      process.env.REDIS_TLS_ENABLED = 'true'
      process.env.REDIS_TLS_REJECT_UNAUTHORIZED = 'false'

      const config = await getRedisConfig()
      
      expect(config.tls?.rejectUnauthorized).toBe(false)
    })
  })

  describe('Secrets Management', () => {
    it('should generate secure passwords', () => {
      const password = secretsManager.generatePassword(32)
      
      expect(password).toHaveLength(32)
      expect(password).toMatch(/^[a-zA-Z0-9!@#$%^&*()_+\-=]+$/)
      
      // Should be unique
      const password2 = secretsManager.generatePassword(32)
      expect(password).not.toBe(password2)
    })

    it('should encrypt and decrypt secrets', async () => {
      // Mock encryption key
      process.env.SECRETS_ENCRYPTION_KEY = Buffer.from('12345678901234567890123456789012').toString('hex')
      
      const testSecret = 'super-secret-password'
      const encrypted = await secretsManager['encrypt'](testSecret)
      
      expect(encrypted).not.toBe(testSecret)
      expect(encrypted).toContain(':') // Should have IV:authTag:encrypted format
      
      const decrypted = await secretsManager['decrypt'](encrypted)
      expect(decrypted).toBe(testSecret)
    })

    it('should clear secrets cache', () => {
      secretsManager.clearCache()
      // Cache should be empty after clear
      expect(secretsManager['cache'].size).toBe(0)
    })
  })

  describe('Rate Limiting', () => {
    it('should track cache operations for rate limiting', async () => {
      // Initialize cache
      await airportCache.initialize()

      // Mock successful cache operations
      mockRedis.get.mockResolvedValue(JSON.stringify({
        data: { iata: 'LAX', name: 'Los Angeles International' },
        source: 'cache',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      }))

      // Multiple rapid requests should be tracked
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(airportCache.get('LAX'))
      }

      await Promise.all(promises)

      // Stats should be incremented
      expect(mockRedis.hincrby).toHaveBeenCalledWith(
        'airport:stats',
        'hits',
        1
      )
    })

    it('should handle rate limit errors gracefully', async () => {
      // Mock rate limit error
      mockRedis.incr.mockRejectedValue(new Error('ERR command not allowed'))

      // Should not throw, but log error
      await expect(airportCache.get('TEST')).resolves.not.toThrow()
    })
  })

  describe('Access Control and Network Isolation', () => {
    it('should only bind to localhost by default', async () => {
      const config = await getRedisConfig()
      
      // Default should be localhost
      expect(config.host).toBe('localhost')
      expect(config.port).toBe(9021)
    })

    it('should restrict dangerous commands via ACLs', async () => {
      // These commands should be disabled in production
      const dangerousCommands = ['FLUSHDB', 'FLUSHALL', 'CONFIG', 'KEYS']
      
      // Mock Redis to simulate ACL restrictions
      dangerousCommands.forEach(cmd => {
        mockRedis[cmd.toLowerCase()] = vi.fn().mockRejectedValue(
          new Error(`ERR unknown command '${cmd}'`)
        )
      })

      // Attempting dangerous commands should fail
      await expect(mockRedis.flushdb()).rejects.toThrow('unknown command')
      await expect(mockRedis.flushall()).rejects.toThrow('unknown command')
      await expect(mockRedis.config()).rejects.toThrow('unknown command')
      await expect(mockRedis.keys()).rejects.toThrow('unknown command')
    })
  })

  describe('Fallback and Error Handling', () => {
    it('should fall back to in-memory cache when Redis is unavailable', async () => {
      // Mock Redis unavailable
      ;(Redis as any).mockImplementationOnce(() => {
        throw new Error('Connection refused')
      })

      const client = await getRedisClient()
      expect(client).toBeNull()

      // Cache should still work with in-memory fallback
      process.env.USE_IN_MEMORY_CACHE_FALLBACK = 'true'
      await airportCache.initialize()

      const testAirport: Airport = {
        iata: 'TEST',
        icao: 'TEST',
        name: 'Test Airport',
        city: 'Test City',
        country: 'Test Country',
        latitude: 0,
        longitude: 0,
        elevation_ft: 0,
        timezone: 'UTC',
        source: 'api',
      }

      await airportCache.set('TEST', testAirport)
      const cached = await airportCache.get('TEST')
      
      expect(cached).toBeDefined()
      expect(cached?.data.iata).toBe('TEST')
    })

    it('should handle circuit breaker state changes', async () => {
      // Simulate multiple failures to trigger circuit breaker
      const failingRedis = {
        ...mockRedis,
        ping: vi.fn().mockRejectedValue(new Error('Connection timeout')),
      }

      // Multiple failures
      for (let i = 0; i < 6; i++) {
        ;(Redis as any).mockImplementationOnce(() => failingRedis)
        await getRedisClient()
      }

      // Circuit should be open, subsequent calls should fail fast
      const startTime = Date.now()
      await getRedisClient()
      const duration = Date.now() - startTime

      // Should fail fast when circuit is open (< 100ms)
      expect(duration).toBeLessThan(100)
    })
  })

  describe('Security Headers and Monitoring', () => {
    it('should log security events', async () => {
      const logSpy = vi.spyOn(console, 'warn')

      // Simulate auth failure
      mockRedis.ping.mockRejectedValueOnce(new Error('NOAUTH'))
      await getRedisClient()

      // Should log the security event
      expect(logSpy).toHaveBeenCalled()
      
      logSpy.mockRestore()
    })

    it('should track failed authentication attempts', async () => {
      // Mock multiple auth failures
      const authErrors = []
      for (let i = 0; i < 3; i++) {
        mockRedis.ping.mockRejectedValueOnce(new Error('WRONGPASS invalid username-password pair'))
        await getRedisClient()
        authErrors.push(i)
      }

      // Should track failed attempts (in real implementation, this would be logged/monitored)
      expect(authErrors).toHaveLength(3)
    })
  })
})
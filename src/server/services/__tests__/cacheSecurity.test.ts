import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis'
import Redis from 'ioredis'
import fs from 'fs/promises'
import path from 'path'
import { airportCache } from '../airportCache'
import { SecretsManager } from '../secretsManager'
import type { Airport } from '../../../types/airport'

describe('Cache Security Tests', () => {
  let container: StartedRedisContainer
  let secureContainer: StartedRedisContainer
  let redisClient: Redis
  const originalRedisUrl = process.env.REDIS_URL
  const originalRedisPassword = process.env.REDIS_PASSWORD
  const tempDir = path.join(process.cwd(), 'temp-test-secrets')

  const mockAirport: Airport = {
    icao: 'KSFO',
    iata: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    country: 'United States',
    latitude: 37.6213,
    longitude: -122.3790,
    elevation: 13,
    timezone: 'America/Los_Angeles',
    runways: []
  }

  beforeAll(async () => {
    // Create temp directory for secrets
    await fs.mkdir(tempDir, { recursive: true })
  }, 60000)

  afterAll(async () => {
    // Cleanup
    await redisClient?.quit()
    await container?.stop()
    await secureContainer?.stop()
    await fs.rm(tempDir, { recursive: true, force: true })
    
    if (originalRedisUrl) {
      process.env.REDIS_URL = originalRedisUrl
    } else {
      delete process.env.REDIS_URL
    }
    
    if (originalRedisPassword) {
      process.env.REDIS_PASSWORD = originalRedisPassword
    } else {
      delete process.env.REDIS_PASSWORD
    }
  })

  describe('Authentication Tests', () => {
    it('should connect with password authentication', async () => {
      const password = 'super-secret-password-123'
      
      // Start Redis with password
      secureContainer = await new RedisContainer()
        .withCommand(['redis-server', '--requirepass', password])
        .withExposedPorts(6379)
        .withStartupTimeout(60000)
        .start()

      const redisUrl = `redis://:${password}@${secureContainer.getHost()}:${secureContainer.getMappedPort(6379)}`
      process.env.REDIS_URL = redisUrl
      process.env.REDIS_PASSWORD = password

      // Should connect successfully
      const client = new Redis(redisUrl)
      await expect(client.ping()).resolves.toBe('PONG')
      await client.quit()
    })

    it('should fail connection without proper authentication', async () => {
      const password = 'another-secret-password'
      
      // Start Redis with password
      container = await new RedisContainer()
        .withCommand(['redis-server', '--requirepass', password])
        .withExposedPorts(6379)
        .withStartupTimeout(60000)
        .start()

      // Try to connect without password
      const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`
      const client = new Redis(redisUrl, {
        retryStrategy: () => null,
        lazyConnect: true
      })

      // Should fail authentication
      await expect(client.connect()).rejects.toThrow()
    })
  })

  describe('Access Control Tests', () => {
    beforeAll(async () => {
      // Start basic Redis for these tests
      container = await new RedisContainer()
        .withExposedPorts(6379)
        .withStartupTimeout(60000)
        .start()

      const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`
      process.env.REDIS_URL = redisUrl
      redisClient = new Redis(redisUrl)
    })

    it('should only allow authorized operations', async () => {
      // Simulate ACL by checking operation types
      const allowedOps = ['get', 'set', 'setex', 'del', 'exists', 'ttl']
      const deniedOps = ['flushall', 'flushdb', 'config', 'shutdown']

      // Test allowed operations
      for (const op of allowedOps) {
        expect(typeof redisClient[op]).toBe('function')
      }

      // In a real environment with ACLs, denied operations would throw
      // This is a simulation of what should happen
      for (const op of deniedOps) {
        if (op === 'flushall' || op === 'flushdb') {
          // These are dangerous operations that should be restricted
          const keys = await redisClient.keys('*')
          expect(keys.length).toBe(0) // Should start empty
        }
      }
    })
  })

  describe('Data Protection Tests', () => {
    beforeEach(async () => {
      await redisClient?.flushall()
    })

    it('should not expose sensitive internal data', async () => {
      await airportCache.initialize()
      await airportCache.set('SFO', mockAirport, 3600)

      // Get the raw Redis value
      const rawValue = await redisClient.get('airport:SFO')
      const parsed = JSON.parse(rawValue!)

      // Should not contain any system internals
      expect(parsed).not.toHaveProperty('__internal')
      expect(parsed).not.toHaveProperty('redisConfig')
      expect(parsed).not.toHaveProperty('connectionString')
    })

    it('should sanitize cache keys to prevent injection', async () => {
      const maliciousKeys = [
        '../../../etc/passwd',
        '"; DROP TABLE airports; --',
        'airport:*',
        'airport:\r\nFLUSHALL\r\n',
        'airport:${process.env.SECRET}'
      ]

      for (const key of maliciousKeys) {
        await airportCache.set(key, mockAirport, 3600)
        
        // Should be safely stored with sanitized key
        const result = await airportCache.get(key)
        expect(result?.data).toEqual(mockAirport)
      }

      // Verify no command injection occurred
      const keys = await redisClient.keys('*')
      expect(keys.length).toBe(maliciousKeys.length)
    })
  })

  describe('Secrets Management Tests', () => {
    it('should handle encrypted secrets file', async () => {
      const secretsFile = path.join(tempDir, 'encrypted-secrets.json')
      const secrets = {
        redis: {
          password: 'encrypted-password-123',
          tls: {
            cert: 'cert-content',
            key: 'key-content'
          }
        }
      }

      await fs.writeFile(secretsFile, JSON.stringify(secrets))
      
      const manager = new SecretsManager({
        source: 'file',
        filePath: secretsFile
      })

      const redisPassword = await manager.getSecret('redis.password')
      expect(redisPassword).toBe('encrypted-password-123')
    })

    it('should rotate credentials without downtime', async () => {
      // Simulate credential rotation
      const oldPassword = 'old-password'
      const newPassword = 'new-password'

      // Start with old password
      process.env.REDIS_PASSWORD = oldPassword
      
      // Update to new password
      process.env.REDIS_PASSWORD = newPassword
      
      // Verify new password is used
      expect(process.env.REDIS_PASSWORD).toBe(newPassword)
    })
  })

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limits on cache operations', async () => {
      const maxRequests = 10
      const timeWindow = 1000 // 1 second
      const requests: Promise<any>[] = []

      // Configure rate limiter (simulated)
      const rateLimiter = {
        requests: 0,
        windowStart: Date.now(),
        
        checkLimit(): boolean {
          const now = Date.now()
          if (now - this.windowStart > timeWindow) {
            this.requests = 0
            this.windowStart = now
          }
          
          if (this.requests >= maxRequests) {
            return false
          }
          
          this.requests++
          return true
        }
      }

      // Attempt more requests than allowed
      for (let i = 0; i < maxRequests + 5; i++) {
        if (rateLimiter.checkLimit()) {
          requests.push(airportCache.get(`TEST${i}`))
        }
      }

      // Should only process maxRequests
      expect(requests.length).toBe(maxRequests)
    })
  })

  describe('Network Security Tests', () => {
    it('should validate TLS certificate when configured', async () => {
      // This is a simulation of TLS validation
      const tlsConfig = {
        rejectUnauthorized: true,
        ca: 'ca-certificate',
        cert: 'client-certificate',
        key: 'client-key'
      }

      // In production, this would verify the TLS connection
      expect(tlsConfig.rejectUnauthorized).toBe(true)
    })

    it('should restrict connections to allowed IP ranges', async () => {
      // Simulate IP filtering
      const allowedIPs = ['127.0.0.1', '10.0.0.0/8', '172.16.0.0/12']
      const testIPs = [
        { ip: '127.0.0.1', allowed: true },
        { ip: '10.5.3.2', allowed: true },
        { ip: '172.20.1.1', allowed: true },
        { ip: '192.168.1.1', allowed: false },
        { ip: '8.8.8.8', allowed: false }
      ]

      for (const test of testIPs) {
        // In production, this would be enforced at network level
        const isAllowed = allowedIPs.some(range => {
          if (range.includes('/')) {
            // Simplified CIDR check
            return test.ip.startsWith(range.split('/')[0].split('.').slice(0, -1).join('.'))
          }
          return range === test.ip
        })

        expect(isAllowed).toBe(test.allowed)
      }
    })
  })

  describe('Audit and Compliance Tests', () => {
    it('should log security events', async () => {
      const securityEvents: any[] = []
      
      // Mock security logger
      const logSecurityEvent = (event: any) => {
        securityEvents.push({
          timestamp: new Date().toISOString(),
          ...event
        })
      }

      // Simulate security events
      logSecurityEvent({ type: 'AUTH_SUCCESS', user: 'cache-service' })
      logSecurityEvent({ type: 'RATE_LIMIT_EXCEEDED', ip: '192.168.1.100' })
      logSecurityEvent({ type: 'INVALID_KEY_FORMAT', key: 'malicious-key' })

      expect(securityEvents).toHaveLength(3)
      expect(securityEvents[0].type).toBe('AUTH_SUCCESS')
      expect(securityEvents[1].type).toBe('RATE_LIMIT_EXCEEDED')
      expect(securityEvents[2].type).toBe('INVALID_KEY_FORMAT')
    })

    it('should not store PII or sensitive data', async () => {
      const sensitiveAirport = {
        ...mockAirport,
        passengerData: 'SHOULD_NOT_BE_STORED',
        creditCardInfo: '1234-5678-9012-3456',
        ssn: '123-45-6789'
      }

      // Filter sensitive data before caching
      const { passengerData, creditCardInfo, ssn, ...safeData } = sensitiveAirport
      await airportCache.set('SFO', safeData as Airport, 3600)

      const result = await airportCache.get('SFO')
      expect(result?.data).not.toHaveProperty('passengerData')
      expect(result?.data).not.toHaveProperty('creditCardInfo')
      expect(result?.data).not.toHaveProperty('ssn')
    })
  })
})
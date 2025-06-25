import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis'
import Redis from 'ioredis'
import { airportCache } from '../airportCache'
import { getRedisClient } from '../redisClient'
import type { Airport } from '../../../types/airport'

describe('Airport Cache Integration Tests', () => {
  let container: StartedRedisContainer
  let redisClient: Redis
  const originalRedisUrl = process.env.REDIS_URL

  const mockAirport: Airport = {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    latitude: 40.6413,
    longitude: -73.7781,
    elevation: 13,
    timezone: 'America/New_York',
    runways: [
      {
        id: 'r1',
        direction: '04L/22R',
        length: 12079,
        width: 200,
        surface: 'Asphalt'
      }
    ]
  }

  beforeAll(async () => {
    // Start Redis container
    container = await new RedisContainer()
      .withExposedPorts(6379)
      .withStartupTimeout(60000)
      .start()

    const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`
    process.env.REDIS_URL = redisUrl

    // Initialize Redis client
    redisClient = new Redis(redisUrl)
    await redisClient.ping()

    // Initialize cache
    await airportCache.initialize()
  }, 60000)

  afterAll(async () => {
    await redisClient?.quit()
    await container?.stop()
    
    // Restore original REDIS_URL
    if (originalRedisUrl) {
      process.env.REDIS_URL = originalRedisUrl
    } else {
      delete process.env.REDIS_URL
    }
  })

  beforeEach(async () => {
    // Clear all data before each test
    await redisClient.flushall()
  })

  describe('Basic Cache Operations', () => {
    it('should store and retrieve airport data', async () => {
      await airportCache.set('JFK', mockAirport, 3600)
      
      const result = await airportCache.get('JFK')
      
      expect(result).toBeDefined()
      expect(result?.data).toEqual(mockAirport)
      expect(result?.source).toBe('cache')
    })

    it('should return null for non-existent airport', async () => {
      const result = await airportCache.get('NONEXISTENT')
      expect(result).toBeNull()
    })

    it('should handle TTL correctly', async () => {
      await airportCache.set('JFK', mockAirport, 1) // 1 second TTL
      
      // Should exist immediately
      let result = await airportCache.get('JFK')
      expect(result).toBeDefined()
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      result = await airportCache.get('JFK')
      expect(result).toBeNull()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent reads safely', async () => {
      await airportCache.set('JFK', mockAirport, 3600)
      
      // Perform concurrent reads
      const promises = Array(10).fill(null).map(() => airportCache.get('JFK'))
      const results = await Promise.all(promises)
      
      // All results should be identical
      results.forEach(result => {
        expect(result?.data).toEqual(mockAirport)
      })
    })

    it('should handle concurrent writes safely', async () => {
      const airports = Array(5).fill(null).map((_, i) => ({
        ...mockAirport,
        iata: `AP${i}`,
        icao: `KAP${i}`,
        name: `Airport ${i}`
      }))
      
      // Perform concurrent writes
      const promises = airports.map((airport, i) => 
        airportCache.set(`AP${i}`, airport, 3600)
      )
      await Promise.all(promises)
      
      // Verify all writes succeeded
      for (let i = 0; i < 5; i++) {
        const result = await airportCache.get(`AP${i}`)
        expect(result?.data.name).toBe(`Airport ${i}`)
      }
    })
  })

  describe('Cache Invalidation', () => {
    it('should successfully invalidate cache entries', async () => {
      await airportCache.set('JFK', mockAirport, 3600)
      
      // Verify exists
      let result = await airportCache.get('JFK')
      expect(result).toBeDefined()
      
      // Invalidate
      await airportCache.invalidate('JFK')
      
      // Verify removed
      result = await airportCache.get('JFK')
      expect(result).toBeNull()
    })

    it('should handle invalidation of non-existent keys', async () => {
      await expect(airportCache.invalidate('NONEXISTENT')).resolves.not.toThrow()
    })
  })

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      // Reset stats
      await redisClient.del('cache:stats')
      
      // Miss
      await airportCache.get('JFK')
      
      // Set value
      await airportCache.set('JFK', mockAirport, 3600)
      
      // Hit
      await airportCache.get('JFK')
      
      const stats = await airportCache.getStats()
      expect(stats.hits).toBeGreaterThan(0)
      expect(stats.misses).toBeGreaterThan(0)
    })
  })

  describe('Data Integrity', () => {
    it('should preserve complex data structures', async () => {
      const complexAirport: Airport = {
        ...mockAirport,
        runways: [
          {
            id: 'r1',
            direction: '04L/22R',
            length: 12079,
            width: 200,
            surface: 'Asphalt',
            ils: true,
            lighting: 'HIRL'
          },
          {
            id: 'r2',
            direction: '13L/31R',
            length: 14572,
            width: 200,
            surface: 'Concrete'
          }
        ],
        additionalInfo: {
          elevation: 13,
          magneticVariation: -13.1,
          transitionAltitude: 18000
        }
      }
      
      await airportCache.set('JFK', complexAirport, 3600)
      const result = await airportCache.get('JFK')
      
      expect(result?.data).toEqual(complexAirport)
      expect(result?.data.runways).toHaveLength(2)
      expect(result?.data.additionalInfo).toBeDefined()
    })

    it('should handle special characters in airport codes', async () => {
      const specialCodes = ['LAX-1', 'NYC/JFK', 'LON_HTR']
      
      for (const code of specialCodes) {
        await airportCache.set(code, { ...mockAirport, iata: code }, 3600)
        const result = await airportCache.get(code)
        expect(result?.data.iata).toBe(code)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Force disconnect
      await redisClient.disconnect()
      
      // Should fallback to in-memory cache
      await expect(airportCache.get('JFK')).resolves.not.toThrow()
      
      // Reconnect
      await redisClient.connect()
    })

    it('should handle invalid data gracefully', async () => {
      // Manually insert invalid JSON
      await redisClient.set('airport:INVALID', 'not-json')
      
      const result = await airportCache.get('INVALID')
      expect(result).toBeNull()
    })
  })

  describe('Two-Level Caching', () => {
    it('should populate in-memory cache on Redis hits', async () => {
      await airportCache.set('JFK', mockAirport, 3600)
      
      // First get - from Redis
      const result1 = await airportCache.get('JFK')
      expect(result1?.source).toBe('cache')
      
      // Clear Redis but in-memory should have it
      await redisClient.flushall()
      
      // Second get - should come from in-memory
      const result2 = await airportCache.get('JFK')
      expect(result2?.source).toBe('in-memory')
    })
  })
})
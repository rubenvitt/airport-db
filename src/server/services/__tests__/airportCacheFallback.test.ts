// Airport cache fallback tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { airportCache } from '../airportCache'
import { getRedisClient, getRedisCircuitBreaker } from '../redisClient'
import { inMemoryAirportCache } from '../inMemoryCache'
import { CircuitState } from '../circuitBreaker'
import type { Airport } from '../../../types/airport'

// Mock the dependencies
vi.mock('../redisClient')
vi.mock('../inMemoryCache', () => ({
  inMemoryAirportCache: {
    initialize: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    getStats: vi.fn().mockResolvedValue({ hits: 0, misses: 0, errors: 0, lastReset: Date.now() })
  }
}))

const mockAirport: Airport = {
  icao: 'KLAX',
  iata: 'LAX',
  name: 'Los Angeles International Airport',
  city: 'Los Angeles',
  country: 'United States',
  latitude: 33.9425,
  longitude: -118.4081,
  elevation: 125,
  timezone: 'America/Los_Angeles',
  runways: []
}

describe('AirportCache Fallback Scenarios', () => {
  let mockRedisClient: any
  let mockCircuitBreaker: any

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup Redis client mock
    mockRedisClient = {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      keys: vi.fn(),
      hgetall: vi.fn().mockResolvedValue({}),
      hincrby: vi.fn(),
      hset: vi.fn(),
      status: 'ready'
    }
    
    // Setup circuit breaker mock
    mockCircuitBreaker = {
      getState: vi.fn().mockReturnValue(CircuitState.CLOSED),
      execute: vi.fn((fn) => fn())
    }
    
    ;(getRedisClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockRedisClient)
    ;(getRedisCircuitBreaker as ReturnType<typeof vi.fn>).mockReturnValue(mockCircuitBreaker)
    
    await airportCache.initialize()
  })

  describe('Normal operation', () => {
    it('should use Redis when available', async () => {
      const cacheData = {
        data: mockAirport,
        source: 'cache',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000
      }
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheData))
      
      const result = await airportCache.get('LAX')
      
      expect(result).toEqual(cacheData)
      expect(mockRedisClient.get).toHaveBeenCalledWith('airport:LAX')
      expect(inMemoryAirportCache.set).toHaveBeenCalledWith('airport:LAX', mockAirport, expect.any(Number))
    })

    it('should save to both Redis and in-memory cache', async () => {
      await airportCache.set('LAX', mockAirport, 3600)
      
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'airport:LAX',
        3600,
        expect.stringContaining('"icao":"KLAX"')
      )
      expect(inMemoryAirportCache.set).toHaveBeenCalledWith('airport:LAX', mockAirport, 3600)
    })
  })

  describe('Circuit breaker OPEN', () => {
    beforeEach(() => {
      mockCircuitBreaker.getState.mockReturnValue(CircuitState.OPEN)
    })

    it('should fallback to in-memory cache when circuit is open', async () => {
      const inMemoryData = {
        data: mockAirport,
        source: 'in-memory',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000
      }
      
      ;(inMemoryAirportCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(inMemoryData)
      
      const result = await airportCache.get('LAX')
      
      expect(result).toEqual(inMemoryData)
      expect(mockRedisClient.get).not.toHaveBeenCalled()
      expect(inMemoryAirportCache.get).toHaveBeenCalledWith('airport:LAX')
    })

    it('should only save to in-memory when circuit is open', async () => {
      await airportCache.set('LAX', mockAirport, 3600)
      
      expect(mockRedisClient.setex).not.toHaveBeenCalled()
      expect(inMemoryAirportCache.set).toHaveBeenCalledWith('airport:LAX', mockAirport, 3600)
    })
  })

  describe('Redis failures with fallback', () => {
    it('should fallback to in-memory on Redis error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'))
      
      const inMemoryData = {
        data: mockAirport,
        source: 'in-memory',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000
      }
      
      ;(inMemoryAirportCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(inMemoryData)
      
      const result = await airportCache.get('LAX')
      
      expect(result).toEqual(inMemoryData)
      expect(inMemoryAirportCache.get).toHaveBeenCalledWith('airport:LAX')
    })

    it('should continue saving to in-memory even if Redis fails', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis write error'))
      
      await airportCache.set('LAX', mockAirport, 3600)
      
      expect(inMemoryAirportCache.set).toHaveBeenCalledWith('airport:LAX', mockAirport, 3600)
    })
  })

  describe('Two-level caching', () => {
    it('should check in-memory cache when Redis returns null', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      
      const inMemoryData = {
        data: mockAirport,
        source: 'in-memory',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000
      }
      
      ;(inMemoryAirportCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(inMemoryData)
      
      const result = await airportCache.get('LAX')
      
      expect(result).toEqual(inMemoryData)
      expect(mockRedisClient.get).toHaveBeenCalled()
      expect(inMemoryAirportCache.get).toHaveBeenCalledWith('airport:LAX')
    })
  })

  describe('Fallback mode (no Redis)', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      ;(getRedisClient as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      await airportCache.initialize()
    })

    it('should operate entirely with in-memory cache', async () => {
      const inMemoryData = {
        data: mockAirport,
        source: 'in-memory',
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000
      }
      
      ;(inMemoryAirportCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(inMemoryData)
      
      const result = await airportCache.get('LAX')
      
      expect(result).toEqual(inMemoryData)
      expect(inMemoryAirportCache.get).toHaveBeenCalledWith('airport:LAX')
    })

    it('should return stats from in-memory cache in fallback mode', async () => {
      const mockStats = { hits: 10, misses: 5, errors: 1, lastReset: Date.now() }
      ;(inMemoryAirportCache.getStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockStats)
      
      const stats = await airportCache.getStats()
      
      expect(stats).toEqual(mockStats)
    })
  })
})
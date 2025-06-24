// In-memory cache tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InMemoryCache } from '../inMemoryCache'
import type { Airport } from '../../../types/airport'

describe('InMemoryCache', () => {
  let cache: InMemoryCache<Airport>

  beforeEach(() => {
    cache = new InMemoryCache<Airport>(3, 100) // Small size for testing
  })

  afterEach(() => {
    cache.destroy()
  })

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

  describe('basic operations', () => {
    it('should store and retrieve items', async () => {
      await cache.set('test-key', mockAirport, 60)
      
      const result = await cache.get('test-key')
      expect(result).not.toBeNull()
      expect(result?.data).toEqual(mockAirport)
      expect(result?.source).toBe('in-memory')
    })

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should delete items', async () => {
      await cache.set('test-key', mockAirport, 60)
      
      const deleted = await cache.delete('test-key')
      expect(deleted).toBe(true)
      
      const result = await cache.get('test-key')
      expect(result).toBeNull()
    })

    it('should check existence', async () => {
      await cache.set('test-key', mockAirport, 60)
      
      expect(await cache.exists('test-key')).toBe(true)
      expect(await cache.exists('non-existent')).toBe(false)
    })
  })

  describe('expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should expire items after TTL', async () => {
      await cache.set('test-key', mockAirport, 1) // 1 second TTL
      
      // Item should exist initially
      expect(await cache.exists('test-key')).toBe(true)
      
      // Advance time past TTL
      vi.advanceTimersByTime(1100)
      
      // Item should be expired
      expect(await cache.exists('test-key')).toBe(false)
      const result = await cache.get('test-key')
      expect(result).toBeNull()
    })

    it('should clean up expired items periodically', async () => {
      await cache.set('key1', mockAirport, 1)
      await cache.set('key2', mockAirport, 60)
      
      // Advance time to expire key1 but not key2
      vi.advanceTimersByTime(1100)
      
      // Trigger cleanup
      vi.advanceTimersByTime(100)
      
      expect(await cache.exists('key1')).toBe(false)
      expect(await cache.exists('key2')).toBe(true)
    })
  })

  describe('size limits and eviction', () => {
    it('should evict oldest items when at capacity', async () => {
      const airport1 = { ...mockAirport, icao: 'KJFK' }
      const airport2 = { ...mockAirport, icao: 'KORD' }
      const airport3 = { ...mockAirport, icao: 'KDFW' }
      const airport4 = { ...mockAirport, icao: 'KATL' }
      
      // Fill cache to capacity
      await cache.set('key1', airport1, 60)
      await new Promise(resolve => setTimeout(resolve, 10)) // Ensure different timestamps
      await cache.set('key2', airport2, 60)
      await new Promise(resolve => setTimeout(resolve, 10))
      await cache.set('key3', airport3, 60)
      
      // Add one more - should evict oldest (key1)
      await cache.set('key4', airport4, 60)
      
      expect(await cache.exists('key1')).toBe(false)
      expect(await cache.exists('key2')).toBe(true)
      expect(await cache.exists('key3')).toBe(true)
      expect(await cache.exists('key4')).toBe(true)
    })
  })

  describe('pattern matching', () => {
    it('should clear all items', async () => {
      await cache.set('key1', mockAirport, 60)
      await cache.set('key2', mockAirport, 60)
      await cache.set('key3', mockAirport, 60)
      
      const deleted = await cache.clear()
      expect(deleted).toBe(3)
      
      expect(await cache.exists('key1')).toBe(false)
      expect(await cache.exists('key2')).toBe(false)
      expect(await cache.exists('key3')).toBe(false)
    })

    it('should clear items matching pattern', async () => {
      await cache.set('airport:LAX', mockAirport, 60)
      await cache.set('airport:JFK', mockAirport, 60)
      await cache.set('flight:123', mockAirport, 60)
      
      const deleted = await cache.clear('airport:*')
      expect(deleted).toBe(2)
      
      expect(await cache.exists('airport:LAX')).toBe(false)
      expect(await cache.exists('airport:JFK')).toBe(false)
      expect(await cache.exists('flight:123')).toBe(true)
    })
  })

  describe('statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('test-key', mockAirport, 60)
      
      // Hit
      await cache.get('test-key')
      
      // Misses
      await cache.get('non-existent')
      await cache.get('another-non-existent')
      
      const stats = await cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(2)
      expect(stats.errors).toBe(0)
    })

    it('should reset stats', async () => {
      await cache.get('non-existent')
      await cache.get('another')
      
      let stats = await cache.getStats()
      expect(stats.misses).toBe(2)
      
      await cache.resetStats()
      
      stats = await cache.getStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.errors).toBe(0)
    })
  })
})
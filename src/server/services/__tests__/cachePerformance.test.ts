import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis'
import autocannon from 'autocannon'
import { createServer } from 'node:http'
import { airportCache } from '../airportCache'
import type { Airport } from '../../../types/airport'

describe('Cache Performance Tests', () => {
  let container: StartedRedisContainer
  let server: ReturnType<typeof createServer>
  let serverUrl: string
  const originalRedisUrl = process.env.REDIS_URL

  const mockAirports: Airport[] = Array(100).fill(null).map((_, i) => ({
    icao: `KABC${i}`,
    iata: `AB${i}`,
    name: `Test Airport ${i}`,
    city: `City ${i}`,
    country: 'Test Country',
    latitude: 40 + (i % 10),
    longitude: -73 - (i % 10),
    elevation: 100 + i,
    timezone: 'UTC',
    runways: []
  }))

  beforeAll(async () => {
    // Start Redis container
    container = await new RedisContainer()
      .withExposedPorts(6379)
      .withStartupTimeout(60000)
      .start()

    const redisUrl = `redis://${container.getHost()}:${container.getMappedPort(6379)}`
    process.env.REDIS_URL = redisUrl

    // Initialize cache
    await airportCache.initialize()

    // Prepopulate cache
    await Promise.all(
      mockAirports.map((airport, i) => 
        airportCache.set(`AB${i}`, airport, 3600)
      )
    )

    // Create test server
    server = createServer(async (req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`)
      const code = url.searchParams.get('code')
      
      if (code) {
        const result = await airportCache.get(code)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } else {
        res.writeHead(400)
        res.end('Missing code parameter')
      }
    })

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address()
        if (addr && typeof addr === 'object') {
          serverUrl = `http://localhost:${addr.port}`
        }
        resolve()
      })
    })
  }, 60000)

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await container?.stop()
    
    if (originalRedisUrl) {
      process.env.REDIS_URL = originalRedisUrl
    } else {
      delete process.env.REDIS_URL
    }
  })

  describe('Throughput Tests', () => {
    it('should handle high read throughput', async () => {
      const result = await new Promise<any>((resolve, reject) => {
        autocannon({
          url: `${serverUrl}/?code=AB1`,
          connections: 10,
          duration: 10,
          pipelining: 1
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      // Should handle at least 1000 requests per second
      expect(result.requests.average).toBeGreaterThan(1000)
      // 99th percentile latency should be under 50ms
      expect(result.latency.p99).toBeLessThan(50)
      // No errors expected
      expect(result.errors).toBe(0)
    })

    it('should handle mixed read patterns efficiently', async () => {
      // Test with different cache keys to simulate real-world access patterns
      const requests = Array(10).fill(null).map((_, i) => ({
        method: 'GET',
        path: `/?code=AB${i}`
      }))

      const result = await new Promise<any>((resolve, reject) => {
        autocannon({
          url: serverUrl,
          connections: 20,
          duration: 10,
          requests
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      expect(result.requests.average).toBeGreaterThan(500)
      expect(result.latency.p99).toBeLessThan(100)
    })
  })

  describe('Latency Tests', () => {
    it('should maintain low latency under load', async () => {
      const result = await new Promise<any>((resolve, reject) => {
        autocannon({
          url: `${serverUrl}/?code=AB50`,
          connections: 50,
          duration: 5,
          pipelining: 4
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      // Average latency should be under 20ms
      expect(result.latency.average).toBeLessThan(20)
      // 95th percentile should be under 40ms
      expect(result.latency.p95).toBeLessThan(40)
    })
  })

  describe('Stress Tests', () => {
    it('should handle burst traffic', async () => {
      const result = await new Promise<any>((resolve, reject) => {
        autocannon({
          url: `${serverUrl}/?code=AB75`,
          connections: 100,
          duration: 5,
          amount: 10000
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      // Should complete all requests
      expect(result.requests.total).toBe(10000)
      // Error rate should be minimal (less than 0.1%)
      expect(result.errors / result.requests.total).toBeLessThan(0.001)
    })
  })

  describe('Cache vs No-Cache Performance', () => {
    it('should show significant performance improvement with caching', async () => {
      // Create endpoint that bypasses cache
      const noCacheServer = createServer(async (req, res) => {
        // Simulate external API call with 100ms latency
        await new Promise(resolve => setTimeout(resolve, 100))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(mockAirports[0]))
      })

      const noCacheUrl = await new Promise<string>((resolve) => {
        noCacheServer.listen(0, () => {
          const addr = noCacheServer.address()
          if (addr && typeof addr === 'object') {
            resolve(`http://localhost:${addr.port}`)
          }
        })
      })

      // Test without cache
      const noCacheResult = await new Promise<any>((resolve, reject) => {
        autocannon({
          url: noCacheUrl,
          connections: 10,
          duration: 5
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      // Test with cache
      const cacheResult = await new Promise<any>((resolve, reject) => {
        autocannon({
          url: `${serverUrl}/?code=AB1`,
          connections: 10,
          duration: 5
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })

      // Cache should be at least 10x faster
      expect(cacheResult.latency.average).toBeLessThan(noCacheResult.latency.average / 10)
      expect(cacheResult.requests.average).toBeGreaterThan(noCacheResult.requests.average * 10)

      await new Promise<void>((resolve) => noCacheServer.close(() => resolve()))
    })
  })
})
// Rate limiting middleware for API security
// Implements multiple strategies: IP-based, API key-based, and endpoint-specific limits

import type { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../services/redisClient'
import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'

const logger = new StructuredLogger(
  'rate-limiter',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

export interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Maximum requests per window
  keyGenerator?: (req: Request) => string  // Custom key generator
  skipSuccessfulRequests?: boolean  // Don't count successful requests
  skipFailedRequests?: boolean     // Don't count failed requests
  standardHeaders?: boolean  // Send rate limit headers
  legacyHeaders?: boolean   // Send X-RateLimit headers
  message?: string         // Error message when rate limited
}

// Default configurations for different endpoints
export const rateLimitConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
  },

  // Airport lookup endpoints (more restrictive)
  airportLookup: {
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 30,           // 30 requests per minute
    standardHeaders: true,
    message: 'Airport lookup rate limit exceeded. Please wait before making more requests.'
  },

  // Flight data endpoints
  flightData: {
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 20,           // 20 requests per minute
    standardHeaders: true,
    message: 'Flight data rate limit exceeded. Please wait before making more requests.'
  },

  // Cache stats endpoint (very permissive)
  cacheStats: {
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 60,           // 60 requests per minute
    standardHeaders: true,
    message: 'Stats endpoint rate limit exceeded.'
  }
}

// In-memory fallback store for when Redis is unavailable
class InMemoryRateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key)
        }
      }
    }, 60000)
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; ttl: number }> {
    const now = Date.now()
    const resetTime = now + windowMs

    const current = this.store.get(key)
    
    if (!current || current.resetTime < now) {
      // New window
      this.store.set(key, { count: 1, resetTime })
      return { count: 1, ttl: windowMs }
    } else {
      // Increment existing
      current.count++
      return { count: current.count, ttl: current.resetTime - now }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
  }
}

// Create in-memory fallback
const inMemoryStore = new InMemoryRateLimitStore()

// Rate limiter factory
export function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate key for this request
      const key = config.keyGenerator 
        ? config.keyGenerator(req) 
        : `rate-limit:${req.ip || req.socket.remoteAddress || 'unknown'}`

      // Try Redis first
      const redis = await getRedisClient()
      let count: number
      let ttl: number

      if (redis && redis.status === 'ready') {
        // Use Redis for distributed rate limiting
        const multi = redis.multi()
        const redisKey = `${key}:${Math.floor(Date.now() / config.windowMs)}`
        
        multi.incr(redisKey)
        multi.expire(redisKey, Math.ceil(config.windowMs / 1000))
        
        const results = await multi.exec()
        
        if (results && results[0] && results[0][1]) {
          count = results[0][1] as number
          ttl = config.windowMs
        } else {
          throw new Error('Redis operation failed')
        }
      } else {
        // Fallback to in-memory store
        logger.debug('Using in-memory rate limit store (Redis unavailable)')
        const result = await inMemoryStore.increment(key, config.windowMs)
        count = result.count
        ttl = result.ttl
      }

      // Set rate limit headers
      if (config.standardHeaders) {
        res.setHeader('RateLimit-Limit', config.maxRequests.toString())
        res.setHeader('RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString())
        res.setHeader('RateLimit-Reset', new Date(Date.now() + ttl).toISOString())
      }

      if (config.legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString())
        res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString())
        res.setHeader('X-RateLimit-Reset', Math.floor((Date.now() + ttl) / 1000).toString())
      }

      // Check if limit exceeded
      if (count > config.maxRequests) {
        res.setHeader('Retry-After', Math.ceil(ttl / 1000).toString())
        
        logger.warn('Rate limit exceeded', {
          key,
          count,
          limit: config.maxRequests,
          ip: req.ip
        })

        return res.status(429).json({
          error: config.message || 'Too many requests',
          retryAfter: Math.ceil(ttl / 1000)
        })
      }

      // Track request completion for conditional counting
      if (config.skipSuccessfulRequests || config.skipFailedRequests) {
        const originalEnd = res.end
        res.end = function(...args: any[]) {
          const shouldDecrement = 
            (config.skipSuccessfulRequests && res.statusCode < 400) ||
            (config.skipFailedRequests && res.statusCode >= 400)

          if (shouldDecrement && redis) {
            // Decrement the counter asynchronously
            redis.decr(`${key}:${Math.floor(Date.now() / config.windowMs)}`).catch(err => {
              logger.error('Failed to decrement rate limit counter', err)
            })
          }

          return originalEnd.apply(res, args)
        }
      }

      next()
    } catch (error) {
      logger.error('Rate limiter error', error as Error)
      
      // Fail open - allow request on error
      // In production, you might want to fail closed instead
      if (process.env.NODE_ENV === 'production' && process.env.RATE_LIMIT_FAIL_CLOSED === 'true') {
        return res.status(503).json({
          error: 'Service temporarily unavailable'
        })
      }
      
      next()
    }
  }
}

// API key based rate limiter
export function createApiKeyRateLimiter(config: RateLimitConfig) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey
      if (apiKey) {
        return `rate-limit:api-key:${apiKey}`
      }
      // Fall back to IP-based limiting
      return `rate-limit:ip:${req.ip || req.socket.remoteAddress || 'unknown'}`
    }
  })
}

// User-based rate limiter (requires authentication)
export function createUserRateLimiter(config: RateLimitConfig) {
  return createRateLimiter({
    ...config,
    keyGenerator: (req: Request) => {
      // Assuming user ID is available on req.user after authentication
      const userId = (req as any).user?.id
      if (userId) {
        return `rate-limit:user:${userId}`
      }
      // Fall back to IP-based limiting
      return `rate-limit:ip:${req.ip || req.socket.remoteAddress || 'unknown'}`
    }
  })
}

// Sliding window rate limiter for more accurate limiting
export function createSlidingWindowRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = config.keyGenerator 
        ? config.keyGenerator(req) 
        : `rate-limit:sliding:${req.ip || req.socket.remoteAddress || 'unknown'}`

      const redis = await getRedisClient()
      if (!redis || redis.status !== 'ready') {
        // Fall back to standard rate limiter if Redis unavailable
        return createRateLimiter(config)(req, res, next)
      }

      const now = Date.now()
      const windowStart = now - config.windowMs

      // Remove old entries and count current window
      const multi = redis.multi()
      multi.zremrangebyscore(key, '-inf', windowStart.toString())
      multi.zadd(key, now.toString(), `${now}-${Math.random()}`)
      multi.zcard(key)
      multi.expire(key, Math.ceil(config.windowMs / 1000))
      
      const results = await multi.exec()
      const count = results && results[2] && results[2][1] ? results[2][1] as number : 0

      // Set headers
      if (config.standardHeaders) {
        res.setHeader('RateLimit-Limit', config.maxRequests.toString())
        res.setHeader('RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString())
        res.setHeader('RateLimit-Reset', new Date(now + config.windowMs).toISOString())
      }

      // Check limit
      if (count > config.maxRequests) {
        logger.warn('Sliding window rate limit exceeded', {
          key,
          count,
          limit: config.maxRequests
        })

        return res.status(429).json({
          error: config.message || 'Too many requests',
          retryAfter: Math.ceil(config.windowMs / 1000)
        })
      }

      next()
    } catch (error) {
      logger.error('Sliding window rate limiter error', error as Error)
      next()
    }
  }
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  inMemoryStore.destroy()
})

process.on('SIGINT', () => {
  inMemoryStore.destroy()
})
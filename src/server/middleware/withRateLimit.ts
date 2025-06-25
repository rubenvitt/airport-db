// Rate limiting wrapper for TanStack Start server functions
import type { ServerFunction } from '@tanstack/start'
import { createRateLimiter, rateLimitConfigs, type RateLimitConfig } from './rateLimiter'
import { getRedisClient } from '../services/redisClient'
import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'

const logger = new StructuredLogger(
  'rate-limit-wrapper',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

// In-memory store for rate limiting when Redis is unavailable
interface RateLimitEntry {
  count: number
  resetTime: number
}

const inMemoryStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetTime < now) {
      inMemoryStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

export interface RateLimitOptions extends Partial<RateLimitConfig> {
  keyGenerator?: (input: any) => string
  skipWhenAuthenticated?: boolean
}

/**
 * Wraps a TanStack Start server function with rate limiting
 */
export function withRateLimit<TInput, TOutput>(
  fn: ServerFunction<TInput, TOutput>,
  config: RateLimitConfig | keyof typeof rateLimitConfigs = 'general',
  options: RateLimitOptions = {}
): ServerFunction<TInput, TOutput> {
  // Get config from presets or use custom config
  const rateLimitConfig: RateLimitConfig = typeof config === 'string' 
    ? rateLimitConfigs[config]
    : config

  // Merge with options
  const finalConfig = { ...rateLimitConfig, ...options }

  return async (input: TInput) => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator 
        ? options.keyGenerator(input)
        : `rate-limit:server-fn:${fn.name || 'anonymous'}`

      // Check rate limit
      const redis = await getRedisClient()
      let count: number
      let ttl: number

      if (redis && redis.status === 'ready') {
        // Use Redis for distributed rate limiting
        const redisKey = `${key}:${Math.floor(Date.now() / finalConfig.windowMs)}`
        
        const multi = redis.multi()
        multi.incr(redisKey)
        multi.expire(redisKey, Math.ceil(finalConfig.windowMs / 1000))
        
        const results = await multi.exec()
        
        if (results && results[0] && results[0][1]) {
          count = results[0][1] as number
          ttl = finalConfig.windowMs
        } else {
          throw new Error('Redis operation failed')
        }
      } else {
        // Fallback to in-memory store
        const now = Date.now()
        const windowKey = `${key}:${Math.floor(now / finalConfig.windowMs)}`
        const entry = inMemoryStore.get(windowKey)

        if (!entry || entry.resetTime < now) {
          // New window
          inMemoryStore.set(windowKey, {
            count: 1,
            resetTime: now + finalConfig.windowMs
          })
          count = 1
          ttl = finalConfig.windowMs
        } else {
          // Increment existing
          entry.count++
          count = entry.count
          ttl = entry.resetTime - now
        }
      }

      // Check if limit exceeded
      if (count > finalConfig.maxRequests) {
        logger.warn('Rate limit exceeded for server function', {
          function: fn.name,
          key,
          count,
          limit: finalConfig.maxRequests
        })

        throw new Error(finalConfig.message || `Rate limit exceeded. Please try again in ${Math.ceil(ttl / 1000)} seconds.`)
      }

      // Call the original function
      return await fn(input)
    } catch (error) {
      // Re-throw rate limit errors
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error
      }

      // Log other errors but don't fail the request
      logger.error('Rate limiter error, allowing request', error as Error)
      
      // Call the original function
      return await fn(input)
    }
  }
}

/**
 * Creates a rate limiter for API key based limiting
 */
export function withApiKeyRateLimit<TInput extends { apiKey?: string }, TOutput>(
  fn: ServerFunction<TInput, TOutput>,
  config: RateLimitConfig | keyof typeof rateLimitConfigs = 'general'
): ServerFunction<TInput, TOutput> {
  return withRateLimit(fn, config, {
    keyGenerator: (input: TInput) => {
      if (input.apiKey) {
        return `rate-limit:api-key:${input.apiKey}`
      }
      return `rate-limit:server-fn:${fn.name || 'anonymous'}:no-key`
    }
  })
}

/**
 * Creates a sliding window rate limiter for more accurate limiting
 */
export function withSlidingWindowRateLimit<TInput, TOutput>(
  fn: ServerFunction<TInput, TOutput>,
  config: RateLimitConfig | keyof typeof rateLimitConfigs = 'general',
  options: RateLimitOptions = {}
): ServerFunction<TInput, TOutput> {
  const rateLimitConfig: RateLimitConfig = typeof config === 'string' 
    ? rateLimitConfigs[config]
    : config

  const finalConfig = { ...rateLimitConfig, ...options }

  return async (input: TInput) => {
    try {
      const key = options.keyGenerator 
        ? options.keyGenerator(input)
        : `rate-limit:sliding:${fn.name || 'anonymous'}`

      const redis = await getRedisClient()
      if (!redis || redis.status !== 'ready') {
        // Fall back to standard rate limiting
        return withRateLimit(fn, config, options)(input)
      }

      const now = Date.now()
      const windowStart = now - finalConfig.windowMs

      // Remove old entries and count current window
      const multi = redis.multi()
      multi.zremrangebyscore(key, '-inf', windowStart.toString())
      multi.zadd(key, now.toString(), `${now}-${Math.random()}`)
      multi.zcard(key)
      multi.expire(key, Math.ceil(finalConfig.windowMs / 1000))
      
      const results = await multi.exec()
      const count = results && results[2] && results[2][1] ? results[2][1] as number : 0

      // Check limit
      if (count > finalConfig.maxRequests) {
        logger.warn('Sliding window rate limit exceeded', {
          function: fn.name,
          key,
          count,
          limit: finalConfig.maxRequests
        })

        throw new Error(finalConfig.message || `Rate limit exceeded. Please try again later.`)
      }

      return await fn(input)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        throw error
      }

      logger.error('Sliding window rate limiter error', error as Error)
      return await fn(input)
    }
  }
}
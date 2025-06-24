// Redis client configuration and initialization

import Redis from 'ioredis'
import { StructuredLogger, jsonTransport, prettyTransport } from '@/lib/cache/observability'

// Load environment variables for server-side only
if (typeof window === 'undefined') {
  await import('dotenv').then(mod => mod.config())
}

const logger = new StructuredLogger(
  'redis',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

export interface RedisConfig {
  url?: string
  host?: string
  port?: number
  password?: string
  maxRetriesPerRequest?: number
  enableReadyCheck?: boolean
  retryStrategy?: (times: number) => number | void
}

let redisClient: Redis | null = null

export function getRedisConfig(): RedisConfig {
  const config: RedisConfig = {}

  if (process.env.REDIS_URL) {
    config.url = process.env.REDIS_URL
  } else {
    config.host = process.env.REDIS_HOST || 'localhost'
    config.port = parseInt(process.env.REDIS_PORT || '9021', 10)
    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD
    }
  }

  // Connection resilience settings
  config.maxRetriesPerRequest = 3
  config.enableReadyCheck = true
  config.retryStrategy = (times: number) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries')
      return null // Stop retrying
    }
    const delay = Math.min(times * 200, 2000)
    logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`, { attempt: times, delay })
    return delay
  }

  return config
}

export async function getRedisClient(): Promise<Redis | null> {
  // Only initialize Redis on server
  if (typeof window !== 'undefined') {
    return null
  }

  if (redisClient && redisClient.status === 'ready') {
    return redisClient
  }

  try {
    const config = getRedisConfig()
    
    logger.info('Initializing Redis connection', { 
      host: config.host, 
      port: config.port,
      url: config.url ? 'configured' : 'not configured'
    })
    
    redisClient = new Redis(config.url || config)

    redisClient.on('connect', () => {
      logger.info('Redis client connected')
    })

    redisClient.on('error', (err) => {
      logger.error('Redis client error', err)
    })

    redisClient.on('ready', () => {
      logger.info('Redis client ready to accept commands')
    })

    redisClient.on('close', () => {
      logger.warn('Redis connection closed')
    })

    redisClient.on('reconnecting', (delay: number) => {
      logger.info('Redis reconnecting', { delay })
    })

    // Test the connection
    await redisClient.ping()
    logger.info('Redis connection established and tested')
    
    return redisClient
  } catch (error) {
    logger.error('Failed to initialize Redis client', error as Error)
    redisClient = null
    return null
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    logger.info('Closing Redis connection')
    await redisClient.quit()
    redisClient = null
  }
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('SIGTERM', async () => {
    await closeRedisClient()
  })
  
  process.on('SIGINT', async () => {
    await closeRedisClient()
  })
}
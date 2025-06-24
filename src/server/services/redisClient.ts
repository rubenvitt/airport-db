// Redis client configuration and initialization

import Redis from 'ioredis'

// Load environment variables for server-side only
if (typeof window === 'undefined') {
  await import('dotenv').then(mod => mod.config())
}

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
    const delay = Math.min(times * 200, 2000)
    console.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`)
    return delay
  }

  return config
}

export async function getRedisClient(): Promise<Redis | null> {
  if (redisClient) {
    return redisClient
  }

  try {
    const config = getRedisConfig()
    redisClient = new Redis(config.url || config)

    redisClient.on('connect', () => {
      console.log('Redis client connected')
    })

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err)
    })

    redisClient.on('ready', () => {
      console.log('Redis client ready')
    })

    // Test the connection
    await redisClient.ping()
    
    return redisClient
  } catch (error) {
    console.error('Failed to initialize Redis client:', error)
    return null
  }
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
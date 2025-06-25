// Redis client configuration and initialization

import Redis from 'ioredis'
import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'
import { CircuitBreaker, CircuitState, ExponentialBackoff } from './circuitBreaker'
import { secretsManager } from './secretsManager'

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
  username?: string
  maxRetriesPerRequest?: number
  enableReadyCheck?: boolean
  retryStrategy?: (times: number) => number | void
  tls?: {
    ca?: string | Buffer
    cert?: string | Buffer
    key?: string | Buffer
    rejectUnauthorized?: boolean
    servername?: string
  }
}

let redisClient: Redis | null = null
let circuitBreaker: CircuitBreaker | null = null

export async function getRedisConfig(): Promise<RedisConfig> {
  const config: RedisConfig = {}

  // Initialize secrets manager
  await secretsManager.initialize()
  const secrets = await secretsManager.getAllSecrets()

  if (process.env.REDIS_URL) {
    config.url = process.env.REDIS_URL
  } else {
    config.host = process.env.REDIS_HOST || 'localhost'
    config.port = parseInt(process.env.REDIS_PORT || '9021', 10)
    
    // Use secrets manager for credentials
    if (secrets.redisPassword) {
      config.password = secrets.redisPassword
    }
    if (secrets.redisUsername) {
      config.username = secrets.redisUsername
    }
  }

  // TLS Configuration
  if (process.env.REDIS_TLS_ENABLED === 'true') {
    config.tls = {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
    }

    // Use secrets for TLS certificates
    if (secrets.redisTlsCa) {
      config.tls.ca = secrets.redisTlsCa
    }

    if (secrets.redisTlsCert) {
      config.tls.cert = secrets.redisTlsCert
    }

    if (secrets.redisTlsKey) {
      config.tls.key = secrets.redisTlsKey
    }

    if (process.env.REDIS_TLS_SERVERNAME) {
      config.tls.servername = process.env.REDIS_TLS_SERVERNAME
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

// Initialize circuit breaker for Redis operations
function initializeCircuitBreaker(): CircuitBreaker {
  if (!circuitBreaker) {
    circuitBreaker = new CircuitBreaker({
      name: 'redis',
      failureThreshold: parseInt(process.env.REDIS_CIRCUIT_FAILURE_THRESHOLD || '5', 10),
      resetTimeout: parseInt(process.env.REDIS_CIRCUIT_RESET_TIMEOUT || '60000', 10),
      halfOpenRequests: parseInt(process.env.REDIS_CIRCUIT_HALF_OPEN_REQUESTS || '3', 10),
      onStateChange: (oldState, newState) => {
        logger.warn('Redis circuit breaker state changed', { oldState, newState })
      }
    })
  }
  return circuitBreaker
}

export async function getRedisClient(): Promise<Redis | null> {
  // Only initialize Redis on server
  if (typeof window !== 'undefined') {
    return null
  }

  if (redisClient && redisClient.status === 'ready') {
    return redisClient
  }

  // Initialize circuit breaker
  const breaker = initializeCircuitBreaker()

  try {
    // Use circuit breaker for connection attempt
    return await breaker.execute(async () => {
      const config = await getRedisConfig()
      
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
    })
  } catch (error) {
    logger.error('Failed to initialize Redis client', error as Error)
    redisClient = null
    return null
  }
}

export function getRedisCircuitBreaker(): CircuitBreaker | null {
  return circuitBreaker || initializeCircuitBreaker()
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
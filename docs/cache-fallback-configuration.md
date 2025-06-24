# Cache Fallback Configuration

This document describes the environment variables and configuration options for the Redis cache fallback and resilience features.

## Redis Connection Configuration

- `REDIS_URL` - Full Redis connection URL (takes precedence over host/port)
- `REDIS_HOST` - Redis server hostname (default: `localhost`)
- `REDIS_PORT` - Redis server port (default: `9021`)
- `REDIS_PASSWORD` - Redis authentication password (optional)

## Circuit Breaker Configuration

The circuit breaker prevents cascading failures when Redis is unavailable:

- `REDIS_CIRCUIT_FAILURE_THRESHOLD` - Number of failures before opening circuit (default: `5`)
- `REDIS_CIRCUIT_RESET_TIMEOUT` - Time in milliseconds before attempting to close circuit (default: `60000` - 1 minute)
- `REDIS_CIRCUIT_HALF_OPEN_REQUESTS` - Number of test requests in half-open state (default: `3`)

## Exponential Backoff Configuration

Controls retry behavior for failed Redis operations:

- `REDIS_BACKOFF_BASE_DELAY` - Initial delay in milliseconds (default: `1000`)
- `REDIS_BACKOFF_MAX_DELAY` - Maximum delay in milliseconds (default: `30000`)
- `REDIS_BACKOFF_MAX_ATTEMPTS` - Maximum number of retry attempts (default: `3`)

## In-Memory Cache Configuration

Local fallback cache when Redis is unavailable:

- `USE_IN_MEMORY_CACHE_FALLBACK` - Enable in-memory fallback (default: `true`, set to `false` to disable)
- `IN_MEMORY_CACHE_MAX_SIZE` - Maximum number of entries (default: `1000`)
- `IN_MEMORY_CACHE_CLEANUP_INTERVAL` - Cleanup interval in milliseconds (default: `300000` - 5 minutes)

## Airport Cache Configuration

- `AIRPORT_CACHE_TTL` - TTL for airport data in seconds (default: `2592000` - 30 days)

## Example .env Configuration

```env
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=9021
# REDIS_PASSWORD=your_password_here
# REDIS_URL=redis://user:password@host:port

# Circuit Breaker
REDIS_CIRCUIT_FAILURE_THRESHOLD=5
REDIS_CIRCUIT_RESET_TIMEOUT=60000
REDIS_CIRCUIT_HALF_OPEN_REQUESTS=3

# Exponential Backoff
REDIS_BACKOFF_BASE_DELAY=1000
REDIS_BACKOFF_MAX_DELAY=30000
REDIS_BACKOFF_MAX_ATTEMPTS=3

# In-Memory Cache
USE_IN_MEMORY_CACHE_FALLBACK=true
IN_MEMORY_CACHE_MAX_SIZE=1000
IN_MEMORY_CACHE_CLEANUP_INTERVAL=300000

# Airport Cache
AIRPORT_CACHE_TTL=2592000
```

## Fallback Behavior

1. **Normal Operation**: Redis is used as primary cache
2. **Redis Failure**: Circuit breaker opens after threshold failures
3. **Fallback Mode**: In-memory cache serves requests
4. **Recovery**: Circuit breaker enters half-open state after timeout
5. **Restoration**: Successful requests close circuit, resuming Redis usage

## Monitoring

The system logs the following events:
- Circuit breaker state changes
- Cache hits/misses from different sources
- Retry attempts and failures
- Fallback activations

Monitor these logs to understand cache health and performance.
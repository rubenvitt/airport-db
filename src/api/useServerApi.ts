// Configuration utility to determine whether to use server-side API calls

export function useServerApi(): boolean {
  // Always use server API in production for better caching
  if (process.env.NODE_ENV === 'production') {
    return true
  }

  // Check if Redis is configured and available
  const hasRedis = Boolean(
    process.env.REDIS_URL || 
    (process.env.REDIS_HOST && process.env.REDIS_PORT)
  )

  // Use server API if Redis is available
  return hasRedis
}

// Environment variable to force client-side API calls
export function forceClientApi(): boolean {
  return process.env.VITE_FORCE_CLIENT_API === 'true'
}
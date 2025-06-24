// Cache key generation utilities

import type { CacheKeyParams } from '../types'

export function generateCacheKey(params: CacheKeyParams): string {
  const { endpoint, params: queryParams, version = 'v1' } = params
  
  // Sort params for consistent keys
  const sortedParams = queryParams 
    ? Object.entries(queryParams)
        .filter(([_, value]) => value !== undefined && value !== null)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
        .join('&')
    : ''

  return `${version}:${endpoint}${sortedParams ? `?${sortedParams}` : ''}`
}

export function parseCacheKey(key: string): CacheKeyParams {
  const [version, rest] = key.split(':')
  const [endpoint, queryString] = rest.split('?')
  
  const params: Record<string, string> = {}
  if (queryString) {
    const searchParams = new URLSearchParams(queryString)
    searchParams.forEach((value, key) => {
      params[key] = value
    })
  }

  return { endpoint, params, version }
}

export function matchPattern(key: string, pattern: string): boolean {
  const regex = new RegExp(
    '^' + pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*') // Replace * with .*
      .replace(/\?/g, '.') // Replace ? with .
    + '$'
  )
  return regex.test(key)
}

export function extractEndpoint(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname
  } catch {
    // If not a valid URL, return as is
    return url
  }
}
// Predefined caching strategies for different types of data

import type { CacheStrategy } from '../types'
import { generateCacheKey } from '../utils/cacheKey'

// Airport data changes infrequently, cache for longer
export const airportStrategy: CacheStrategy = {
  name: 'airport',
  shouldCache: (response) => {
    return response && (
      Array.isArray(response) || 
      (response.iata || response.icao)
    )
  },
  getTTL: () => 7 * 24 * 60 * 60 * 1000, // 7 days
  getCacheKey: (params) => generateCacheKey({ ...params, version: 'airport-v1' }),
  shouldRevalidate: (entry) => {
    const staleTime = 24 * 60 * 60 * 1000 // 1 day
    return Date.now() - entry.metadata.timestamp > staleTime
  }
}

// Flight data changes frequently, cache for shorter periods
export const flightStrategy: CacheStrategy = {
  name: 'flight',
  shouldCache: (response) => {
    return response && (
      Array.isArray(response) ||
      response.icao24 ||
      response.callsign
    )
  },
  getTTL: () => 60 * 1000, // 1 minute for real-time flight data
  getCacheKey: (params) => generateCacheKey({ ...params, version: 'flight-v1' }),
  shouldRevalidate: (entry) => {
    // Always revalidate flight data after 30 seconds
    return Date.now() - entry.metadata.timestamp > 30000
  }
}

// Historical flight data can be cached longer
export const historicalFlightStrategy: CacheStrategy = {
  name: 'historical-flight',
  shouldCache: (response) => {
    return response && Array.isArray(response)
  },
  getTTL: () => 60 * 60 * 1000, // 1 hour for historical data
  getCacheKey: (params) => generateCacheKey({ ...params, version: 'hist-flight-v1' }),
  shouldRevalidate: (entry) => {
    const staleTime = 30 * 60 * 1000 // 30 minutes
    return Date.now() - entry.metadata.timestamp > staleTime
  }
}

// Weather data with moderate caching
export const weatherStrategy: CacheStrategy = {
  name: 'weather',
  shouldCache: (response) => {
    return response && response.weather
  },
  getTTL: () => 30 * 60 * 1000, // 30 minutes
  getCacheKey: (params) => generateCacheKey({ ...params, version: 'weather-v1' }),
  shouldRevalidate: (entry) => {
    const staleTime = 15 * 60 * 1000 // 15 minutes
    return Date.now() - entry.metadata.timestamp > staleTime
  }
}

// Static data like countries, timezones
export const staticDataStrategy: CacheStrategy = {
  name: 'static',
  shouldCache: () => true,
  getTTL: () => 30 * 24 * 60 * 60 * 1000, // 30 days
  getCacheKey: (params) => generateCacheKey({ ...params, version: 'static-v1' }),
  shouldRevalidate: () => false // Never revalidate static data
}

// Default strategy for unknown data types
export const defaultStrategy: CacheStrategy = {
  name: 'default',
  shouldCache: (response) => !!response,
  getTTL: () => 5 * 60 * 1000, // 5 minutes default
  getCacheKey: (params) => generateCacheKey(params),
  shouldRevalidate: (entry) => {
    const staleTime = 2 * 60 * 1000 // 2 minutes
    return Date.now() - entry.metadata.timestamp > staleTime
  }
}

// Strategy selector based on endpoint or data type
export function selectStrategy(endpoint: string, data?: any): CacheStrategy {
  // Check endpoint patterns
  if (endpoint.includes('/airports') || endpoint.includes('iata') || endpoint.includes('icao')) {
    return airportStrategy
  }
  
  if (endpoint.includes('/states') || endpoint.includes('/tracks')) {
    return flightStrategy
  }
  
  if (endpoint.includes('/flights/') && (endpoint.includes('arrival') || endpoint.includes('departure'))) {
    return historicalFlightStrategy
  }
  
  if (endpoint.includes('/weather')) {
    return weatherStrategy
  }
  
  if (endpoint.includes('/countries') || endpoint.includes('/timezones') || endpoint.includes('/static')) {
    return staticDataStrategy
  }
  
  // Check data patterns
  if (data) {
    if (data.iata || data.icao || (Array.isArray(data) && data[0]?.iata)) {
      return airportStrategy
    }
    
    if (data.icao24 || data.callsign || (Array.isArray(data) && data[0]?.icao24)) {
      return flightStrategy
    }
  }
  
  return defaultStrategy
}

export const strategies = {
  airport: airportStrategy,
  flight: flightStrategy,
  historicalFlight: historicalFlightStrategy,
  weather: weatherStrategy,
  static: staticDataStrategy,
  default: defaultStrategy,
}
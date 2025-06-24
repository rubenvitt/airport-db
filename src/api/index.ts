// API exports

export * from './base'
export * from './config'

// For now, just use client-side APIs directly to fix the search
import { airportsApi as clientAirportsApi } from './airports-cached'
import { flightsApi as clientFlightsApi } from './flights'

// Export the APIs
export const airportsApi = clientAirportsApi
export const flightsApi = clientFlightsApi

// Export cache utilities
export { cachedFetch, prefetch, invalidateCache, getCacheStats } from './cachedFetch'
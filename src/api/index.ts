// API exports

export * from './base'
export * from './config'

// Use client-side airports API for airport search (non-external API)
import { airportsApi as clientAirportsApi } from './airports-cached'

// Export the APIs
export const airportsApi = clientAirportsApi

// Note: flightsApi removed - use flightsServerApi from './flights-server' instead

// Export cache utilities
export { cachedFetch, prefetch, invalidateCache, getCacheStats } from './cachedFetch'
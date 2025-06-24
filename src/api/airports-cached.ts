// Airport API client with server-side caching support

import { airportsApi as clientApi } from './airports'
import type { Airport, AirportSearchParams } from '@/types/airport'

// Check if server functions are available
const isServerAvailable = typeof window === 'undefined' || 
  (typeof window !== 'undefined' && import.meta.env.DEV)

// Dynamic imports for server functions to avoid bundling server code in client
let serverFunctions: any = null

if (isServerAvailable) {
  try {
    serverFunctions = await import('../server/functions/airports')
  } catch (error) {
    console.log('Server functions not available, using client-side API')
  }
}

export const airportsApi = {
  /**
   * Search airports using server-side caching when available
   * @param params Search parameters
   * @returns Array of airports matching the search criteria
   */
  async searchAirports(params: AirportSearchParams): Promise<Array<Airport>> {
    // Try server function first if available
    if (serverFunctions?.searchAirports) {
      try {
        const result = await serverFunctions.searchAirports(params)
        console.log(`Airports fetched from ${result.source}`)
        return result.airports
      } catch (error) {
        console.error('Server function failed, falling back to client API:', error)
      }
    }

    // Fall back to client-side API
    return clientApi.searchAirports(params)
  },

  /**
   * Get airport by IATA code with caching
   * @param iataCode IATA code (e.g., "LAX")
   * @returns Airport details or null if not found
   */
  async getAirportByIATA(iataCode: string): Promise<Airport | null> {
    // Try server function first if available
    if (serverFunctions?.getAirportByIATA) {
      try {
        const result = await serverFunctions.getAirportByIATA(iataCode)
        console.log(`Airport ${iataCode} fetched from ${result.source}`)
        return result.airport
      } catch (error) {
        console.error('Server function failed, falling back to client API:', error)
      }
    }

    // Fall back to client-side API
    return clientApi.getAirportByIATA(iataCode)
  },

  /**
   * Get airport by ICAO code with caching
   * @param icaoCode ICAO code (e.g., "KLAX")
   * @returns Airport details or null if not found
   */
  async getAirportByICAO(icaoCode: string): Promise<Airport | null> {
    // Try server function first if available
    if (serverFunctions?.getAirportByICAO) {
      try {
        const result = await serverFunctions.getAirportByICAO(icaoCode)
        console.log(`Airport ${icaoCode} fetched from ${result.source}`)
        return result.airport
      } catch (error) {
        console.error('Server function failed, falling back to client API:', error)
      }
    }

    // Fall back to client-side API
    return clientApi.getAirportByICAO(icaoCode)
  },

  /**
   * Get cache statistics (server-side only)
   * @returns Cache statistics or null if not available
   */
  async getCacheStats(): Promise<any | null> {
    if (serverFunctions?.getCacheStats) {
      try {
        return await serverFunctions.getCacheStats()
      } catch (error) {
        console.error('Failed to get cache stats:', error)
      }
    }
    return null
  },

  // Delegate premium features to client API (these don't support caching in free tier)
  searchByName: clientApi.searchByName.bind(clientApi),
  getAirportsByCity: clientApi.getAirportsByCity.bind(clientApi),
  getAirportsByCountry: clientApi.getAirportsByCountry.bind(clientApi),
}
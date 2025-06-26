// Airport API client with server-side API support (using Vite middleware)

import { airportsApi as clientApi } from './airports'
import type { Airport, AirportSearchParams } from '@/types/airport'

export const airportsApi = {
  /**
   * Search airports using server-side API when available
   * @param params Search parameters
   * @returns Array of airports matching the search criteria
   */
  async searchAirports(params: AirportSearchParams): Promise<Array<Airport>> {
    // Try server API first (Vite middleware)
    if (typeof window !== 'undefined') {
      try {
        const url = new URL('/api/airports', window.location.origin)
        
        // Add search parameters
        if (params.iata) url.searchParams.append('iata', params.iata)
        if (params.icao) url.searchParams.append('icao', params.icao)
        if (params.name) url.searchParams.append('name', params.name)
        if (params.city) url.searchParams.append('city', params.city)
        if (params.country) url.searchParams.append('country', params.country)

        const response = await fetch(url.toString())
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Airports fetched from ${data.source || 'server'}`)
          return data.airports || []
        }
      } catch (error) {
        console.error('Server API failed, falling back to client API:', error)
      }
    }

    // Fall back to client-side API
    return clientApi.searchAirports(params)
  },

  /**
   * Get airport by IATA code with server-side caching
   * @param iataCode IATA code (e.g., "LAX")
   * @returns Airport details or null if not found
   */
  async getAirportByIATA(iataCode: string): Promise<Airport | null> {
    // Try server API first
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/airports/${iataCode}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Airport ${iataCode} fetched from server`)
          // Backend returns airport data directly, not wrapped in an object
          return data
        }
      } catch (error) {
        console.error('Server API failed, falling back to client API:', error)
      }
    }

    // Fall back to client-side API
    return clientApi.getAirportByIATA(iataCode)
  },

  /**
   * Get airport by ICAO code with server-side caching
   * @param icaoCode ICAO code (e.g., "KLAX")
   * @returns Airport details or null if not found
   */
  async getAirportByICAO(icaoCode: string): Promise<Airport | null> {
    // Try server API first
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/api/airports/${icaoCode}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Airport ${icaoCode} fetched from server`)
          // Backend returns airport data directly, not wrapped in an object
          return data
        }
      } catch (error) {
        console.error('Server API failed, falling back to client API:', error)
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
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/cache-stats')
        if (response.ok) {
          return await response.json()
        }
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
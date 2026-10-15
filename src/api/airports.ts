// Airport API client that calls our Next.js backend API

import type { Airport, AirportSearchParams } from '@/types/airport'

export const airportsApi = {
  /**
   * Search airports using our backend API
   * @param params Search parameters
   * @returns Array of airports matching the search criteria
   */
  async searchAirports(params: AirportSearchParams): Promise<Array<Airport>> {
    // For now, we only support searching by IATA or ICAO code via our backend
    if (params.iata) {
      return this.getAirportByIATA(params.iata).then(airport => airport ? [airport] : [])
    }
    if (params.icao) {
      return this.getAirportByICAO(params.icao).then(airport => airport ? [airport] : [])
    }
    
    // Other search parameters are not supported yet
    console.warn('Only IATA and ICAO searches are currently supported')
    return []
  },

  /**
   * Get airport by IATA code
   * @param iataCode IATA code (e.g., "LAX")
   * @returns Airport details or null if not found
   */
  async getAirportByIATA(iataCode: string): Promise<Airport | null> {
    try {
      const response = await fetch(`/api/airports/${iataCode}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch airport: ${response.statusText}`)
      }
      
      const airport = await response.json()
      return airport
    } catch (error) {
      console.error('Error fetching airport by IATA:', error)
      throw error
    }
  },

  /**
   * Get airport by ICAO code
   * @param icaoCode ICAO code (e.g., "KLAX")
   * @returns Airport details or null if not found
   */
  async getAirportByICAO(icaoCode: string): Promise<Airport | null> {
    try {
      const response = await fetch(`/api/airports/${icaoCode}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Failed to fetch airport: ${response.statusText}`)
      }
      
      const airport = await response.json()
      return airport
    } catch (error) {
      console.error('Error fetching airport by ICAO:', error)
      throw error
    }
  },

  /**
   * Search airports by name
   * NOTE: Not implemented yet - requires backend support
   * @param name Airport name (partial match supported)
   * @returns Array of airports
   */
  async searchByName(name: string): Promise<Array<Airport>> {
    console.warn('searchByName is not implemented yet')
    return []
  },

  /**
   * Get airports by city
   * NOTE: Not implemented yet - requires backend support
   * @param city City name
   * @param country Optional country filter
   * @returns Array of airports in the city
   */
  async getAirportsByCity(
    city: string,
    country?: string,
  ): Promise<Array<Airport>> {
    console.warn('getAirportsByCity is not implemented yet')
    return []
  },

  /**
   * Get airports by country
   * NOTE: Not implemented yet - requires backend support
   * @param country Country name
   * @returns Array of airports in the country
   */
  async getAirportsByCountry(
    country: string
  ): Promise<Array<Airport>> {
    console.warn('getAirportsByCountry is not implemented yet')
    return []
  },
}
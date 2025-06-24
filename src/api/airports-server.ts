// Airport API client using backend API routes with Redis caching

import type { Airport, AirportSearchParams } from '@/types/airport'

export const airportsServerApi = {
  /**
   * Search airports using backend API routes
   */
  async searchAirports(params: AirportSearchParams): Promise<Array<Airport>> {
    const url = new URL('/api/airports', window.location.origin)
    
    // Add search parameters
    if (params.iata) url.searchParams.append('iata', params.iata)
    if (params.icao) url.searchParams.append('icao', params.icao)
    if (params.name) url.searchParams.append('name', params.name)
    if (params.city) url.searchParams.append('city', params.city)
    if (params.country) url.searchParams.append('country', params.country)

    const response = await fetch(url.toString())
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const data = await response.json()
    return data.airports
  },

  /**
   * Get airport by IATA code
   */
  async getAirportByIATA(iataCode: string): Promise<Airport | null> {
    const response = await fetch(`/api/airports/${iataCode}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to get airport: ${response.status}`)
    }

    const data = await response.json()
    return data.airport
  },

  /**
   * Get airport by ICAO code
   */
  async getAirportByICAO(icaoCode: string): Promise<Airport | null> {
    const response = await fetch(`/api/airports/${icaoCode}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to get airport: ${response.status}`)
    }

    const data = await response.json()
    return data.airport
  },

  /**
   * Search airports by name (not supported in free tier)
   */
  async searchByName(name: string): Promise<Array<Airport>> {
    console.warn('searchByName requires API Ninjas premium tier')
    return []
  },

  /**
   * Get airports by city (not supported in free tier)
   */
  async getAirportsByCity(
    city: string,
    country?: string,
  ): Promise<Array<Airport>> {
    console.warn('getAirportsByCity requires API Ninjas premium tier')
    return []
  },

  /**
   * Get airports by country (not supported in free tier)
   */
  async getAirportsByCountry(
    country: string
  ): Promise<Array<Airport>> {
    console.warn('getAirportsByCountry requires API Ninjas premium tier')
    return []
  },
}
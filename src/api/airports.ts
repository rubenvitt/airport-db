// Airport API client

import { fetchApi } from './base'
import { API_CONFIG, hasApiKey } from './config'
import type { Airport, AirportSearchParams } from '@/types/airport'
import { RateLimiter } from '@/utils/security'

// Client-side rate limiter for API Ninjas
// Free tier: 10,000 requests/month = ~333/day = ~14/hour
// We'll limit to 10 requests per minute to be conservative
const rateLimiter = new RateLimiter(10, 60000)

export const airportsApi = {
  /**
   * Search airports using API Ninjas
   * NOTE: Free tier only supports IATA and ICAO code searches
   * @param params Search parameters
   * @returns Array of airports matching the search criteria
   */
  async searchAirports(params: AirportSearchParams): Promise<Array<Airport>> {
    if (!hasApiKey.apiNinjas()) {
      throw new Error('API Ninjas API key is not configured')
    }

    // Check rate limit before making the request
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime()
      const waitTime = Math.max(0, resetTime - Date.now())
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. Remaining requests: ${rateLimiter.getRemainingRequests()}`
      )
    }

    // Free tier only supports IATA and ICAO parameters
    const freeParams: Record<string, string | undefined> = {}
    if (params.iata) freeParams.iata = params.iata
    if (params.icao) freeParams.icao = params.icao
    
    // Log if premium parameters were requested
    const premiumParams = ['name', 'city', 'country', 'region', 'min_elevation_ft', 'max_elevation_ft']
    const requestedPremium = premiumParams.filter(param => params[param as keyof AirportSearchParams])
    if (requestedPremium.length > 0) {
      console.warn(`Premium parameters requested but not available in free tier: ${requestedPremium.join(', ')}`)
      console.warn('Free tier only supports IATA and ICAO code searches')
    }
    
    const airports = await fetchApi<Array<Airport>>(
      `${API_CONFIG.apiNinjas.baseUrl}${API_CONFIG.apiNinjas.endpoints.airports}`,
      {
        headers: {
          'X-Api-Key': API_CONFIG.apiNinjas.key,
        },
        params: freeParams,
      },
    )

    return airports
  },

  /**
   * Get airport by IATA code
   * @param iataCode IATA code (e.g., "LAX")
   * @returns Airport details or null if not found
   */
  async getAirportByIATA(iataCode: string): Promise<Airport | null> {
    const airports = await this.searchAirports({ iata: iataCode })
    return airports[0] || null
  },

  /**
   * Get airport by ICAO code
   * @param icaoCode ICAO code (e.g., "KLAX")
   * @returns Airport details or null if not found
   */
  async getAirportByICAO(icaoCode: string): Promise<Airport | null> {
    const airports = await this.searchAirports({ icao: icaoCode })
    return airports[0] || null
  },

  /**
   * Search airports by name
   * NOTE: This is a premium feature - will return empty array for free tier
   * @param name Airport name (partial match supported)
   * @returns Array of airports
   */
  async searchByName(name: string): Promise<Array<Airport>> {
    console.warn('searchByName requires API Ninjas premium tier')
    return []
  },

  /**
   * Get airports by city
   * NOTE: This is a premium feature - will return empty array for free tier
   * @param city City name
   * @param country Optional country filter
   * @returns Array of airports in the city
   */
  async getAirportsByCity(
    city: string,
    country?: string,
  ): Promise<Array<Airport>> {
    console.warn('getAirportsByCity requires API Ninjas premium tier')
    return []
  },

  /**
   * Get airports by country
   * NOTE: This is a premium feature - will return empty array for free tier
   * @param country Country name
   * @returns Array of airports in the country
   */
  async getAirportsByCountry(
    country: string
  ): Promise<Array<Airport>> {
    console.warn('getAirportsByCountry requires API Ninjas premium tier')
    return []
  },
}
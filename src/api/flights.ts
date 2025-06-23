// Flight API client for OpenSky Network

import type {
  FlightState,
  FlightsResponse,
  FlightTrack,
  DepartureArrival,
} from '@/types/flight'
import { fetchApi } from './base'
import { RateLimiter } from '@/utils/security'
import { API_CONFIG } from './config'

// Client-side rate limiter for OpenSky Network
// Anonymous: 10 calls/minute, Authenticated: 1000 calls/minute
// We'll use conservative limits: 5 requests per minute for anonymous
const rateLimiter = new RateLimiter(5, 60000)

// Helper to get auth headers if credentials are available
function getAuthHeaders(): HeadersInit {
  const { username, password } = API_CONFIG.openSky
  if (username && password) {
    const auth = btoa(`${username}:${password}`)
    return { Authorization: `Basic ${auth}` }
  }
  return {}
}

export const flightsApi = {
  /**
   * Get all current flight states
   * @param bbox Optional bounding box (min_lat, min_lon, max_lat, max_lon)
   * @returns Current flight states
   */
  async getAllStates(bbox?: {
    lamin: number
    lomin: number
    lamax: number
    lomax: number
  }): Promise<FlightsResponse> {
    // Check rate limit before making the request
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime()
      const waitTime = Math.max(0, resetTime - Date.now())
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. Remaining requests: ${rateLimiter.getRemainingRequests()}`
      )
    }

    const response = await fetchApi<FlightsResponse>(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.allStates}`,
      {
        headers: getAuthHeaders(),
        params: bbox,
      },
    )
    return response
  },

  /**
   * Get flight track for a specific aircraft
   * @param icao24 ICAO 24-bit address
   * @param time Unix timestamp (uses current time - 30min if not provided)
   * @returns Flight track data
   */
  async getFlightTrack(
    icao24: string,
    time?: number,
  ): Promise<FlightTrack | null> {
    // Check rate limit before making the request
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime()
      const waitTime = Math.max(0, resetTime - Date.now())
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. Remaining requests: ${rateLimiter.getRemainingRequests()}`
      )
    }

    const timestamp = time || Math.floor(Date.now() / 1000) - 1800 // 30 min ago
    const track = await fetchApi<FlightTrack>(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.tracks}`,
      {
        headers: getAuthHeaders(),
        params: { icao24, time: timestamp },
      },
    )
    return track
  },

  /**
   * Get flights by aircraft
   * @param icao24 ICAO 24-bit address
   * @param begin Start time (Unix timestamp)
   * @param end End time (Unix timestamp)
   * @returns Array of flights
   */
  async getFlightsByAircraft(
    icao24: string,
    begin: number,
    end: number,
  ): Promise<DepartureArrival[]> {
    // Check rate limit before making the request
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime()
      const waitTime = Math.max(0, resetTime - Date.now())
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. Remaining requests: ${rateLimiter.getRemainingRequests()}`
      )
    }

    const flights = await fetchApi<DepartureArrival[]>(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.flights.aircraft}`,
      {
        headers: getAuthHeaders(),
        params: { icao24, begin, end },
      },
    )
    return flights
  },

  /**
   * Get arrivals for an airport
   * @param airport ICAO airport code
   * @param begin Start time (Unix timestamp)
   * @param end End time (Unix timestamp)
   * @returns Array of arrival flights
   */
  async getAirportArrivals(
    airport: string,
    begin: number,
    end: number,
  ): Promise<DepartureArrival[]> {
    // Check rate limit before making the request
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime()
      const waitTime = Math.max(0, resetTime - Date.now())
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. Remaining requests: ${rateLimiter.getRemainingRequests()}`
      )
    }

    const arrivals = await fetchApi<DepartureArrival[]>(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.flights.arrival}`,
      {
        headers: getAuthHeaders(),
        params: { airport, begin, end },
      },
    )
    return arrivals
  },

  /**
   * Get departures for an airport
   * @param airport ICAO airport code
   * @param begin Start time (Unix timestamp)
   * @param end End time (Unix timestamp)
   * @returns Array of departure flights
   */
  async getAirportDepartures(
    airport: string,
    begin: number,
    end: number,
  ): Promise<DepartureArrival[]> {
    // Check rate limit before making the request
    if (!rateLimiter.canMakeRequest()) {
      const resetTime = rateLimiter.getResetTime()
      const waitTime = Math.max(0, resetTime - Date.now())
      throw new Error(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds. Remaining requests: ${rateLimiter.getRemainingRequests()}`
      )
    }

    const departures = await fetchApi<DepartureArrival[]>(
      `${API_CONFIG.openSky.baseUrl}${API_CONFIG.openSky.endpoints.flights.departure}`,
      {
        headers: getAuthHeaders(),
        params: { airport, begin, end },
      },
    )
    return departures
  },

  /**
   * Helper to get current flights within a radius of a location
   * @param lat Latitude
   * @param lon Longitude
   * @param radius Radius in degrees (approximately 111km per degree)
   * @returns Current flight states in the area
   */
  async getFlightsNearLocation(
    lat: number,
    lon: number,
    radius: number,
  ): Promise<FlightsResponse> {
    const bbox = {
      lamin: lat - radius,
      lomin: lon - radius,
      lamax: lat + radius,
      lomax: lon + radius,
    }
    return this.getAllStates(bbox)
  },
}
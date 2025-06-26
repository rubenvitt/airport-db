// Flight API client that uses fetch to connect to Express server
import type {
  DepartureArrival,
  FlightState,
  FlightTrack,
  FlightsResponse,
} from '@/types/flight'

const API_BASE = '/api/flights'

export const flightsFetchApi = {
  /**
   * Get all current flight states
   */
  async getAllStates(bbox?: {
    lamin: number
    lomin: number
    lamax: number
    lomax: number
  }): Promise<{ flights: FlightsResponse; source: 'cache' | 'api' }> {
    const url = new URL(`${API_BASE}/states`, window.location.origin)
    
    if (bbox) {
      Object.entries(bbox).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flight states: ${response.statusText}`)
    }
    
    return response.json()
  },

  /**
   * Get flight track for a specific aircraft
   */
  async getFlightTrack(
    icao24: string,
    time?: number,
  ): Promise<{ track: FlightTrack | null; source: 'cache' | 'api' }> {
    const url = new URL(`${API_BASE}/track/${icao24}`, window.location.origin)
    
    if (time) {
      url.searchParams.append('time', String(time))
    }
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flight track: ${response.statusText}`)
    }
    
    return response.json()
  },

  /**
   * Get flights by aircraft
   */
  async getFlightsByAircraft(
    icao24: string,
    begin: number,
    end: number,
  ): Promise<{ flights: DepartureArrival[]; source: 'cache' | 'api' }> {
    const url = new URL(`${API_BASE}/aircraft/${icao24}`, window.location.origin)
    url.searchParams.append('begin', String(begin))
    url.searchParams.append('end', String(end))
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flights by aircraft: ${response.statusText}`)
    }
    
    return response.json()
  },

  /**
   * Get arrivals for an airport
   */
  async getAirportArrivals(
    airport: string,
    begin: number,
    end: number,
  ): Promise<{ arrivals: DepartureArrival[]; source: 'cache' | 'api' }> {
    const url = new URL(`${API_BASE}/arrivals`, window.location.origin)
    url.searchParams.append('airport', airport)
    url.searchParams.append('begin', String(begin))
    url.searchParams.append('end', String(end))
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch airport arrivals: ${response.statusText}`)
    }
    
    return response.json()
  },

  /**
   * Get departures for an airport
   */
  async getAirportDepartures(
    airport: string,
    begin: number,
    end: number,
  ): Promise<{ departures: DepartureArrival[]; source: 'cache' | 'api' }> {
    const url = new URL(`${API_BASE}/departures`, window.location.origin)
    url.searchParams.append('airport', airport)
    url.searchParams.append('begin', String(begin))
    url.searchParams.append('end', String(end))
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch airport departures: ${response.statusText}`)
    }
    
    return response.json()
  },

  /**
   * Get current flights within a radius of a location
   */
  async getFlightsNearLocation(
    lat: number,
    lon: number,
    radius: number,
  ): Promise<{ flights: FlightsResponse; source: 'cache' | 'api' }> {
    const url = new URL(`${API_BASE}/near`, window.location.origin)
    url.searchParams.append('lat', String(lat))
    url.searchParams.append('lon', String(lon))
    url.searchParams.append('radius', String(radius))
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flights near location: ${response.statusText}`)
    }
    
    return response.json()
  },

  /**
   * Get OpenSky authentication status
   */
  async getAuthStatus(): Promise<{
    authType: 'oauth2' | 'basic' | 'none'
    isAuthenticated: boolean
  }> {
    const response = await fetch(`${API_BASE}/auth-status`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch auth status: ${response.statusText}`)
    }
    
    return response.json()
  },
}
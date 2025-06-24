// Airport related types

export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  region: string
  country: string
  elevation_ft: number
  latitude: number
  longitude: number
  timezone: string
}

export interface AirportSearchParams {
  name?: string
  iata?: string
  icao?: string
  city?: string
  country?: string
  region?: string
  min_elevation_ft?: number
  max_elevation_ft?: number
  offset?: number
}

export interface AirportApiResponse {
  airports: Array<Airport>
  total?: number
  offset?: number
  limit?: number
}
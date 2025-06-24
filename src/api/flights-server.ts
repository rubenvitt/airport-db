// Flight API client that uses server functions with Redis caching

import type {
  DepartureArrival,
  FlightState,
  FlightTrack,
  FlightsResponse,
} from '@/types/flight'
import {
  getAllFlightStates,
  getFlightTrack as serverGetTrack,
  getFlightsByAircraft as serverGetByAircraft,
  getAirportArrivals as serverGetArrivals,
  getAirportDepartures as serverGetDepartures,
  getFlightsNearLocation as serverGetNearLocation,
} from '@/server/functions/flights'

export const flightsServerApi = {
  /**
   * Get all current flight states
   */
  async getAllStates(bbox?: {
    lamin: number
    lomin: number
    lamax: number
    lomax: number
  }): Promise<FlightsResponse> {
    const result = await getAllFlightStates(bbox)
    return result.flights
  },

  /**
   * Get flight track for a specific aircraft
   */
  async getFlightTrack(
    icao24: string,
    time?: number,
  ): Promise<FlightTrack | null> {
    const result = await serverGetTrack({ icao24, time })
    return result.track
  },

  /**
   * Get flights by aircraft
   */
  async getFlightsByAircraft(
    icao24: string,
    begin: number,
    end: number,
  ): Promise<Array<DepartureArrival>> {
    const result = await serverGetByAircraft({ icao24, begin, end })
    return result.flights
  },

  /**
   * Get arrivals for an airport
   */
  async getAirportArrivals(
    airport: string,
    begin: number,
    end: number,
  ): Promise<Array<DepartureArrival>> {
    const result = await serverGetArrivals({ airport, begin, end })
    return result.arrivals
  },

  /**
   * Get departures for an airport
   */
  async getAirportDepartures(
    airport: string,
    begin: number,
    end: number,
  ): Promise<Array<DepartureArrival>> {
    const result = await serverGetDepartures({ airport, begin, end })
    return result.departures
  },

  /**
   * Get current flights within a radius of a location
   */
  async getFlightsNearLocation(
    lat: number,
    lon: number,
    radius: number,
  ): Promise<FlightsResponse> {
    const result = await serverGetNearLocation({ lat, lon, radius })
    return result.flights
  },
}
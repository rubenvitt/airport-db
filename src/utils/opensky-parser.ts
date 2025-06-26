import type { FlightState } from '@/types/flight'

/**
 * Parse OpenSky API state vector array into FlightState object
 * OpenSky returns data as arrays for efficiency:
 * [icao24, callsign, origin_country, time_position, last_contact, 
 *  longitude, latitude, baro_altitude, on_ground, velocity, 
 *  true_track, vertical_rate, sensors, geo_altitude, squawk, 
 *  spi, position_source]
 */
export function parseOpenSkyState(stateVector: any[]): FlightState {
  return {
    icao24: stateVector[0] || '',
    callsign: stateVector[1] ? stateVector[1].trim() : null,
    origin_country: stateVector[2] || '',
    time_position: stateVector[3],
    last_contact: stateVector[4] || 0,
    longitude: stateVector[5],
    latitude: stateVector[6],
    baro_altitude: stateVector[7],
    on_ground: stateVector[8] || false,
    velocity: stateVector[9],
    true_track: stateVector[10],
    vertical_rate: stateVector[11],
    sensors: stateVector[12],
    geo_altitude: stateVector[13],
    squawk: stateVector[14],
    spi: stateVector[15] || false,
    position_source: stateVector[16] || 0,
  }
}

/**
 * Parse OpenSky API response
 */
export function parseOpenSkyResponse(data: any): { time: number; states: FlightState[] } {
  if (!data) {
    return { time: Date.now() / 1000, states: [] }
  }

  // If data has time and states properties, parse the states
  if (data.time && data.states) {
    return {
      time: data.time,
      states: (data.states || []).map((state: any[]) => parseOpenSkyState(state))
    }
  }

  // If data is directly an array of states
  if (Array.isArray(data)) {
    return {
      time: Date.now() / 1000,
      states: data.map((state: any[]) => 
        Array.isArray(state) ? parseOpenSkyState(state) : state
      )
    }
  }

  return { time: Date.now() / 1000, states: [] }
}
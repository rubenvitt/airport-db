// Flight related types from OpenSky Network API

export interface FlightState {
  icao24: string // Unique ICAO 24-bit address of the transponder in hex string
  callsign: string | null // Callsign of the vehicle (8 chars)
  origin_country: string // Country name inferred from the ICAO 24-bit address
  time_position: number | null // Unix timestamp (seconds) for the last position update
  last_contact: number // Unix timestamp (seconds) for the last update
  longitude: number | null // WGS84 longitude in decimal degrees
  latitude: number | null // WGS84 latitude in decimal degrees
  baro_altitude: number | null // Barometric altitude in meters
  on_ground: boolean // Boolean value which indicates if the position was retrieved from a surface position report
  velocity: number | null // Velocity over ground in m/s
  true_track: number | null // True track in decimal degrees clockwise from north
  vertical_rate: number | null // Vertical rate in m/s. A positive value indicates that the airplane is climbing
  sensors: number[] | null // IDs of the receivers which contributed to this state vector
  geo_altitude: number | null // Geometric altitude in meters
  squawk: string | null // The transponder code
  spi: boolean // Whether flight status indicates special purpose indicator
  position_source: number // Origin of this state's position
}

export interface FlightsResponse {
  time: number
  states: FlightState[]
}

export interface FlightTrack {
  icao24: string
  startTime: number
  endTime: number
  callsign: string
  path: Array<[
    number, // time
    number | null, // latitude
    number | null, // longitude
    number | null, // altitude
    number | null, // true_track
    boolean // on_ground
  ]>
}

export interface DepartureArrival {
  icao24: string
  firstSeen: number
  estDepartureAirport: string | null
  lastSeen: number
  estArrivalAirport: string | null
  callsign: string | null
  estDepartureAirportHorizDistance: number | null
  estDepartureAirportVertDistance: number | null
  estArrivalAirportHorizDistance: number | null
  estArrivalAirportVertDistance: number | null
  departureAirportCandidatesCount: number
  arrivalAirportCandidatesCount: number
}
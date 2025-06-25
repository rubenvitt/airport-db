import type { FlightState } from '@/types/flight'

export interface FlightBounds {
  lamin: number
  lomin: number  
  lamax: number
  lomax: number
}

export interface FlightUpdate {
  flight: FlightState
  timestamp: number
  isNew: boolean
}

export interface FlightQueryOptions {
  bounds?: FlightBounds
  callsigns?: string[]
  countries?: string[]
  onGround?: boolean
  maxAge?: number // in milliseconds
}

export interface FlightStorageMetrics {
  totalFlights: number
  activeFlights: number
  staleFlights: number
  memoryUsage: number
  updateRate: number
  queryCount: number
}

export interface SpatialIndex {
  insert(flight: FlightState): void
  remove(icao24: string): void
  query(bounds: FlightBounds): FlightState[]
  clear(): void
}

/**
 * Simple grid-based spatial index for geographic queries
 * Divides the world into a grid for faster spatial lookups
 */
export class GridSpatialIndex implements SpatialIndex {
  private gridSize: number
  private grid: Map<string, Set<string>> = new Map()
  private flightPositions: Map<string, { lat: number; lon: number }> = new Map()
  private flights: Map<string, FlightState>

  constructor(flights: Map<string, FlightState>, gridSize = 1) {
    this.flights = flights
    this.gridSize = gridSize
  }

  private getGridKey(lat: number, lon: number): string {
    const gridLat = Math.floor(lat / this.gridSize)
    const gridLon = Math.floor(lon / this.gridSize)
    return `${gridLat},${gridLon}`
  }

  private getGridKeysForBounds(bounds: FlightBounds): string[] {
    const keys: string[] = []
    const minGridLat = Math.floor(bounds.lamin / this.gridSize)
    const maxGridLat = Math.floor(bounds.lamax / this.gridSize)
    const minGridLon = Math.floor(bounds.lomin / this.gridSize)
    const maxGridLon = Math.floor(bounds.lomax / this.gridSize)

    for (let lat = minGridLat; lat <= maxGridLat; lat++) {
      for (let lon = minGridLon; lon <= maxGridLon; lon++) {
        keys.push(`${lat},${lon}`)
      }
    }
    return keys
  }

  insert(flight: FlightState): void {
    if (flight.latitude === null || flight.longitude === null) return

    // Remove from old position if exists
    this.remove(flight.icao24)

    // Add to new position
    const gridKey = this.getGridKey(flight.latitude, flight.longitude)
    if (!this.grid.has(gridKey)) {
      this.grid.set(gridKey, new Set())
    }
    this.grid.get(gridKey)!.add(flight.icao24)
    this.flightPositions.set(flight.icao24, { 
      lat: flight.latitude, 
      lon: flight.longitude 
    })
  }

  remove(icao24: string): void {
    const position = this.flightPositions.get(icao24)
    if (!position) return

    const gridKey = this.getGridKey(position.lat, position.lon)
    const gridCell = this.grid.get(gridKey)
    if (gridCell) {
      gridCell.delete(icao24)
      if (gridCell.size === 0) {
        this.grid.delete(gridKey)
      }
    }
    this.flightPositions.delete(icao24)
  }

  query(bounds: FlightBounds): FlightState[] {
    const results: FlightState[] = []
    const gridKeys = this.getGridKeysForBounds(bounds)
    const checkedFlights = new Set<string>()

    for (const gridKey of gridKeys) {
      const gridCell = this.grid.get(gridKey)
      if (!gridCell) continue

      for (const icao24 of gridCell) {
        if (checkedFlights.has(icao24)) continue
        checkedFlights.add(icao24)

        const flight = this.flights.get(icao24)
        if (!flight || flight.latitude === null || flight.longitude === null) continue

        // Double-check bounds (grid cells may overlap)
        if (flight.latitude >= bounds.lamin && 
            flight.latitude <= bounds.lamax &&
            flight.longitude >= bounds.lomin && 
            flight.longitude <= bounds.lomax) {
          results.push(flight)
        }
      }
    }

    return results
  }

  clear(): void {
    this.grid.clear()
    this.flightPositions.clear()
  }
}

/**
 * Efficient flight data store with spatial indexing and real-time updates
 */
export class FlightDataStore {
  private flights = new Map<string, FlightState>()
  private lastUpdate = new Map<string, number>()
  private spatialIndex: SpatialIndex
  private staleThreshold: number
  private maxFlights: number
  private queryCount = 0
  private updateCount = 0
  private lastCleanup = Date.now()

  constructor(options: {
    staleThreshold?: number
    maxFlights?: number
    spatialGridSize?: number
  } = {}) {
    this.staleThreshold = options.staleThreshold || 300000 // 5 minutes
    this.maxFlights = options.maxFlights || 50000
    this.spatialIndex = new GridSpatialIndex(this.flights, options.spatialGridSize)
  }

  /**
   * Update or insert a flight
   */
  updateFlight(flight: FlightState): FlightUpdate {
    const now = Date.now()
    const isNew = !this.flights.has(flight.icao24)
    
    // Update flight data
    this.flights.set(flight.icao24, flight)
    this.lastUpdate.set(flight.icao24, now)
    this.updateCount++

    // Update spatial index
    this.spatialIndex.insert(flight)

    // Periodic cleanup to prevent memory bloat
    if (now - this.lastCleanup > 60000) { // Every minute
      this.cleanup()
      this.lastCleanup = now
    }

    return {
      flight,
      timestamp: now,
      isNew
    }
  }

  /**
   * Get a specific flight by ICAO24
   */
  getFlight(icao24: string): FlightState | null {
    this.queryCount++
    return this.flights.get(icao24) || null
  }

  /**
   * Query flights with various filters
   */
  queryFlights(options: FlightQueryOptions = {}): FlightState[] {
    this.queryCount++
    const now = Date.now()
    const maxAge = options.maxAge || this.staleThreshold
    
    let results: FlightState[]

    // Start with spatial query if bounds provided
    if (options.bounds) {
      results = this.spatialIndex.query(options.bounds)
    } else {
      results = Array.from(this.flights.values())
    }

    // Apply filters
    return results.filter(flight => {
      // Age filter
      const lastSeen = this.lastUpdate.get(flight.icao24) || 0
      if (now - lastSeen > maxAge) return false

      // Callsign filter
      if (options.callsigns && options.callsigns.length > 0) {
        if (!flight.callsign || !options.callsigns.includes(flight.callsign.trim())) {
          return false
        }
      }

      // Country filter
      if (options.countries && options.countries.length > 0) {
        if (!options.countries.includes(flight.origin_country)) {
          return false
        }
      }

      // Ground status filter
      if (options.onGround !== undefined) {
        if (flight.on_ground !== options.onGround) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Get all flights within a radius of a point
   */
  getFlightsNearPoint(lat: number, lon: number, radiusKm: number): FlightState[] {
    // Convert radius to approximate lat/lon bounds
    const latDelta = radiusKm / 111.32 // Approximate km per degree lat
    const lonDelta = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180)) // Adjust for longitude

    const bounds: FlightBounds = {
      lamin: lat - latDelta,
      lamax: lat + latDelta,
      lomin: lon - lonDelta,
      lomax: lon + lonDelta
    }

    const candidates = this.spatialIndex.query(bounds)
    
    // Filter by actual distance
    return candidates.filter(flight => {
      if (flight.latitude === null || flight.longitude === null) return false
      
      const distance = this.haversineDistance(
        lat, lon,
        flight.latitude, flight.longitude
      )
      return distance <= radiusKm
    })
  }

  /**
   * Remove a flight from the store
   */
  removeFlight(icao24: string): boolean {
    const existed = this.flights.has(icao24)
    this.flights.delete(icao24)
    this.lastUpdate.delete(icao24)
    this.spatialIndex.remove(icao24)
    return existed
  }

  /**
   * Get store metrics
   */
  getMetrics(): FlightStorageMetrics {
    const now = Date.now()
    const activeFlights = this.queryFlights({ maxAge: this.staleThreshold }).length
    const staleFlights = this.flights.size - activeFlights

    return {
      totalFlights: this.flights.size,
      activeFlights,
      staleFlights,
      memoryUsage: this.estimateMemoryUsage(),
      updateRate: this.updateCount,
      queryCount: this.queryCount
    }
  }

  /**
   * Clear all flight data
   */
  clear(): void {
    this.flights.clear()
    this.lastUpdate.clear()
    this.spatialIndex.clear()
    this.updateCount = 0
    this.queryCount = 0
  }

  /**
   * Bulk update multiple flights efficiently
   */
  bulkUpdate(flights: FlightState[]): FlightUpdate[] {
    const updates: FlightUpdate[] = []
    
    for (const flight of flights) {
      updates.push(this.updateFlight(flight))
    }

    return updates
  }

  /**
   * Get all flights currently tracked
   */
  getAllFlights(): FlightState[] {
    return Array.from(this.flights.values())
  }

  /**
   * Get flight count
   */
  getFlightCount(): number {
    return this.flights.size
  }

  private cleanup(): void {
    const now = Date.now()
    const toRemove: string[] = []

    // Remove stale flights
    for (const [icao24, lastSeen] of this.lastUpdate) {
      if (now - lastSeen > this.staleThreshold * 2) { // 2x threshold for cleanup
        toRemove.push(icao24)
      }
    }

    // Remove oldest flights if over limit
    if (this.flights.size > this.maxFlights) {
      const sortedByAge = Array.from(this.lastUpdate.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, this.flights.size - this.maxFlights)
      
      for (const [icao24] of sortedByAge) {
        toRemove.push(icao24)
      }
    }

    // Perform removals
    for (const icao24 of toRemove) {
      this.removeFlight(icao24)
    }

    if (toRemove.length > 0) {
      console.log(`Cleaned up ${toRemove.length} stale flights`)
    }
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private estimateMemoryUsage(): number {
    // Rough estimate in bytes
    const flightSize = 400 // Estimated bytes per flight object
    const indexOverhead = this.flights.size * 50 // Estimated spatial index overhead
    return this.flights.size * flightSize + indexOverhead
  }
}
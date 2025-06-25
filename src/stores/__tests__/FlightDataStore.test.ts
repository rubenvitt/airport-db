import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FlightDataStore, GridSpatialIndex } from '../FlightDataStore'
import type { FlightState } from '@/types/flight'

// Mock flight data
const createMockFlight = (overrides: Partial<FlightState> = {}): FlightState => ({
  icao24: 'abc123',
  callsign: 'FL001',
  origin_country: 'Germany',
  time_position: Date.now(),
  last_contact: Date.now(),
  longitude: 13.4050,
  latitude: 52.5200,
  baro_altitude: 10000,
  on_ground: false,
  velocity: 500,
  true_track: 90,
  vertical_rate: 0,
  sensors: null,
  geo_altitude: 10000,
  squawk: '1234',
  spi: false,
  position_source: 0,
  ...overrides,
})

describe('GridSpatialIndex', () => {
  let flights: Map<string, FlightState>
  let index: GridSpatialIndex

  beforeEach(() => {
    flights = new Map()
    index = new GridSpatialIndex(flights, 1) // 1 degree grid size
  })

  it('should insert and query flights by location', () => {
    const flight1 = createMockFlight({ icao24: 'flight1', latitude: 52.5, longitude: 13.4 })
    const flight2 = createMockFlight({ icao24: 'flight2', latitude: 52.6, longitude: 13.5 })
    const flight3 = createMockFlight({ icao24: 'flight3', latitude: 51.5, longitude: 12.4 })

    flights.set('flight1', flight1)
    flights.set('flight2', flight2)
    flights.set('flight3', flight3)

    index.insert(flight1)
    index.insert(flight2)
    index.insert(flight3)

    // Query area containing flight1 and flight2
    const results = index.query({
      lamin: 52.0,
      lamax: 53.0,
      lomin: 13.0,
      lomax: 14.0,
    })

    expect(results).toHaveLength(2)
    expect(results.map(f => f.icao24)).toContain('flight1')
    expect(results.map(f => f.icao24)).toContain('flight2')
    expect(results.map(f => f.icao24)).not.toContain('flight3')
  })

  it('should remove flights from spatial index', () => {
    const flight = createMockFlight({ icao24: 'flight1', latitude: 52.5, longitude: 13.4 })
    flights.set('flight1', flight)
    
    index.insert(flight)
    
    let results = index.query({
      lamin: 52.0,
      lamax: 53.0,
      lomin: 13.0,
      lomax: 14.0,
    })
    expect(results).toHaveLength(1)

    index.remove('flight1')
    
    results = index.query({
      lamin: 52.0,
      lamax: 53.0,
      lomin: 13.0,
      lomax: 14.0,
    })
    expect(results).toHaveLength(0)
  })

  it('should handle flights with null coordinates', () => {
    const flight = createMockFlight({ icao24: 'flight1', latitude: null, longitude: null })
    flights.set('flight1', flight)

    expect(() => index.insert(flight)).not.toThrow()
    
    const results = index.query({
      lamin: -90,
      lamax: 90,
      lomin: -180,
      lomax: 180,
    })
    expect(results).toHaveLength(0)
  })
})

describe('FlightDataStore', () => {
  let store: FlightDataStore

  beforeEach(() => {
    store = new FlightDataStore({
      staleThreshold: 60000, // 1 minute for testing
      maxFlights: 1000,
      spatialGridSize: 1,
    })
  })

  it('should store and retrieve flights', () => {
    const flight = createMockFlight({ icao24: 'test123' })
    
    const update = store.updateFlight(flight)
    expect(update.isNew).toBe(true)
    expect(update.flight).toEqual(flight)

    const retrieved = store.getFlight('test123')
    expect(retrieved).toEqual(flight)
  })

  it('should update existing flights', () => {
    const flight1 = createMockFlight({ icao24: 'test123', baro_altitude: 10000 })
    const flight2 = createMockFlight({ icao24: 'test123', baro_altitude: 15000 })

    store.updateFlight(flight1)
    const update = store.updateFlight(flight2)

    expect(update.isNew).toBe(false)
    expect(store.getFlight('test123')?.baro_altitude).toBe(15000)
  })

  it('should query flights by bounds', () => {
    const flight1 = createMockFlight({ icao24: 'berlin', latitude: 52.5, longitude: 13.4 })
    const flight2 = createMockFlight({ icao24: 'munich', latitude: 48.1, longitude: 11.6 })
    const flight3 = createMockFlight({ icao24: 'hamburg', latitude: 53.6, longitude: 10.0 })

    store.updateFlight(flight1)
    store.updateFlight(flight2)
    store.updateFlight(flight3)

    // Query northern Germany area
    const results = store.queryFlights({
      bounds: {
        lamin: 52.0,
        lamax: 54.0,
        lomin: 10.0,
        lomax: 14.0,
      }
    })

    expect(results).toHaveLength(2)
    expect(results.map(f => f.icao24)).toContain('berlin')
    expect(results.map(f => f.icao24)).toContain('hamburg')
    expect(results.map(f => f.icao24)).not.toContain('munich')
  })

  it('should filter flights by callsign', () => {
    store.updateFlight(createMockFlight({ icao24: 'flight1', callsign: 'LH123' }))
    store.updateFlight(createMockFlight({ icao24: 'flight2', callsign: 'BA456' }))
    store.updateFlight(createMockFlight({ icao24: 'flight3', callsign: 'LH789' }))

    const results = store.queryFlights({
      callsigns: ['LH123', 'LH789']
    })

    expect(results).toHaveLength(2)
    expect(results.map(f => f.callsign)).toContain('LH123')
    expect(results.map(f => f.callsign)).toContain('LH789')
  })

  it('should filter flights by ground status', () => {
    store.updateFlight(createMockFlight({ icao24: 'airborne', on_ground: false }))
    store.updateFlight(createMockFlight({ icao24: 'grounded', on_ground: true }))

    const airborne = store.queryFlights({ onGround: false })
    const grounded = store.queryFlights({ onGround: true })

    expect(airborne).toHaveLength(1)
    expect(airborne[0].icao24).toBe('airborne')
    
    expect(grounded).toHaveLength(1)
    expect(grounded[0].icao24).toBe('grounded')
  })

  it('should find flights near a point', () => {
    // Berlin area flights
    store.updateFlight(createMockFlight({ 
      icao24: 'close', 
      latitude: 52.51, 
      longitude: 13.41 // ~1km from Berlin center
    }))
    store.updateFlight(createMockFlight({ 
      icao24: 'far', 
      latitude: 48.1, 
      longitude: 11.6 // Munich, ~500km away
    }))

    const nearbyFlights = store.getFlightsNearPoint(52.5200, 13.4050, 10) // 10km radius
    
    expect(nearbyFlights).toHaveLength(1)
    expect(nearbyFlights[0].icao24).toBe('close')
  })

  it('should remove flights', () => {
    const flight = createMockFlight({ icao24: 'test123' })
    store.updateFlight(flight)

    expect(store.getFlight('test123')).not.toBeNull()
    
    const removed = store.removeFlight('test123')
    expect(removed).toBe(true)
    expect(store.getFlight('test123')).toBeNull()
  })

  it('should bulk update flights', () => {
    const flights = [
      createMockFlight({ icao24: 'flight1' }),
      createMockFlight({ icao24: 'flight2' }),
      createMockFlight({ icao24: 'flight3' }),
    ]

    const updates = store.bulkUpdate(flights)

    expect(updates).toHaveLength(3)
    expect(updates.every(u => u.isNew)).toBe(true)
    expect(store.getFlightCount()).toBe(3)
  })

  it('should provide accurate metrics', () => {
    store.updateFlight(createMockFlight({ icao24: 'flight1' }))
    store.updateFlight(createMockFlight({ icao24: 'flight2' }))

    const metrics = store.getMetrics()

    expect(metrics.totalFlights).toBe(2)
    expect(metrics.activeFlights).toBe(2)
    expect(metrics.memoryUsage).toBeGreaterThan(0)
  })

  it('should clear all data', () => {
    store.updateFlight(createMockFlight({ icao24: 'flight1' }))
    store.updateFlight(createMockFlight({ icao24: 'flight2' }))

    expect(store.getFlightCount()).toBe(2)

    store.clear()

    expect(store.getFlightCount()).toBe(0)
    expect(store.getAllFlights()).toHaveLength(0)
  })

  it('should handle age-based filtering', () => {
    const now = Date.now()
    
    // Create flights with different ages
    store.updateFlight(createMockFlight({ icao24: 'fresh' }))
    
    // Mock an older flight by manipulating the lastUpdate time
    const oldFlight = createMockFlight({ icao24: 'stale' })
    store.updateFlight(oldFlight)
    
    // Manually set an old timestamp (this is a bit of a hack for testing)
    const staleTime = now - 120000 // 2 minutes ago
    ;(store as any).lastUpdate.set('stale', staleTime)

    // Query with max age of 1 minute
    const recentFlights = store.queryFlights({ maxAge: 60000 })
    
    expect(recentFlights).toHaveLength(1)
    expect(recentFlights[0].icao24).toBe('fresh')
  })

  it('should handle concurrent access safely', () => {
    const flight = createMockFlight({ icao24: 'concurrent' })
    
    // Simulate concurrent updates
    const updates = Promise.all([
      Promise.resolve(store.updateFlight(flight)),
      Promise.resolve(store.updateFlight({ ...flight, baro_altitude: 15000 })),
      Promise.resolve(store.updateFlight({ ...flight, baro_altitude: 20000 })),
    ])

    expect(updates).resolves.toHaveLength(3)
    expect(store.getFlight('concurrent')).not.toBeNull()
  })

  it('should estimate memory usage', () => {
    const metrics1 = store.getMetrics()
    
    // Add some flights
    for (let i = 0; i < 100; i++) {
      store.updateFlight(createMockFlight({ icao24: `flight${i}` }))
    }
    
    const metrics2 = store.getMetrics()
    
    expect(metrics2.memoryUsage).toBeGreaterThan(metrics1.memoryUsage)
  })
})
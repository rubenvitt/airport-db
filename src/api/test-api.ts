// Simple API test file to verify the setup

import { airportsApi, flightsApi } from './index'

export async function testApiConnection() {
  console.log('Testing API connections...')

  // Test Airport API
  try {
    console.log('\n1. Testing Airport API (API Ninjas)...')
    const airports = await airportsApi.searchByName('Los Angeles')
    console.log(`✅ Found ${airports.length} airports matching "Los Angeles"`)
    if (airports.length > 0) {
      console.log('Sample airport:', airports[0])
    }
  } catch (error) {
    console.error('❌ Airport API Error:', error)
  }

  // Test Flight API
  try {
    console.log('\n2. Testing Flight API (OpenSky Network)...')
    // Get flights in a small area (anonymous access has limitations)
    const flights = await flightsApi.getFlightsNearLocation(
      34.0522, // LA latitude
      -118.2437, // LA longitude
      0.5, // Small radius to avoid too many results
    )
    console.log(`✅ Found ${flights.states?.length || 0} flights in the area`)
    if (flights.states && flights.states.length > 0) {
      console.log('Sample flight:', {
        callsign: flights.states[0].callsign,
        origin_country: flights.states[0].origin_country,
        altitude: flights.states[0].baro_altitude,
        velocity: flights.states[0].velocity,
      })
    }
  } catch (error) {
    console.error('❌ Flight API Error:', error)
  }
}

// Run test if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
  testApiConnection()
}
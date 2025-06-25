import { NextRequest, NextResponse } from 'next/server'
import { airportCache } from '../../../src/server/services/airportCache'
import type { Airport } from '../../../src/types/airport'

const API_NINJAS_URL = 'https://api.api-ninjas.com/v1'
const API_NINJAS_KEY = process.env.API_NINJAS_KEY || 'yCht2E3WowDAz3v2Hn28BQ==7hYVDsQwPCIwiGBN'

// Helper function to call API Ninjas
async function fetchFromApiNinjas(iata?: string | null, icao?: string | null): Promise<Airport[]> {
  if (!API_NINJAS_KEY) {
    throw new Error('API Ninjas API key is not configured')
  }

  const apiUrl = new URL(`${API_NINJAS_URL}/airports`)
  if (iata) apiUrl.searchParams.append('iata', iata)
  if (icao) apiUrl.searchParams.append('icao', icao)

  console.log('Calling API Ninjas:', apiUrl.toString())

  const response = await fetch(apiUrl.toString(), {
    headers: {
      'X-Api-Key': API_NINJAS_KEY,
    },
  })

  console.log('API Ninjas response:', response.status, response.statusText)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('API Ninjas error response:', errorText)
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log('API Ninjas data:', data)
  return data
}

export async function GET(request: NextRequest) {
  try {
    // Initialize airport cache if not already done
    await airportCache.initialize()

    const { searchParams } = new URL(request.url)
    const iata = searchParams.get('iata')
    const icao = searchParams.get('icao')
    
    console.log('=== AIRPORTS API ENDPOINT ===')
    console.log('Query params:', { iata, icao })
    
    // Return error if no valid code provided
    if (!iata && !icao) {
      return NextResponse.json(
        { error: 'IATA or ICAO code required. Use ?iata=CODE or ?icao=CODE' },
        { status: 400 }
      )
    }
    
    let airports = []
    let cached = false
    
    const code = (iata || icao) as string
    const upperCode = code.toUpperCase()
    
    // Try cache first
    const cachedResult = await airportCache.get(upperCode)
    if (cachedResult) {
      airports = [cachedResult.data]
      cached = true
    } else {
      // Call external API
      airports = await fetchFromApiNinjas(
        iata ? String(iata) : null,
        icao ? String(icao) : null
      )
      
      // Cache the result
      if (airports.length > 0) {
        const airport = airports[0]
        if (airport.iata) await airportCache.set(airport.iata, airport)
        if (airport.icao) await airportCache.set(airport.icao, airport)
      }
    }
    
    // For single airport requests, return the airport directly
    return NextResponse.json({
      airport: airports[0] || null,
      source: cached ? 'cache' : 'api',
      cached
    })
  } catch (error) {
    console.error('Error in airports API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
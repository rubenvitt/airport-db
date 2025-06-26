import { NextRequest, NextResponse } from 'next/server'
import { airportCache } from '../../../../src/server/services/airportCache'
import type { Airport } from '../../../../src/types/airport'

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

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    // Initialize airport cache if not already done
    await airportCache.initialize()

    const { code: pathCode } = params
    
    if (!pathCode) {
      return NextResponse.json(
        { error: 'Airport code is required' },
        { status: 400 }
      )
    }

    const upperCode = pathCode.toUpperCase()
    
    // Validate code format (3 or 4 letters)
    if (!/^[A-Z]{3,4}$/.test(upperCode)) {
      return NextResponse.json(
        { error: 'Airport code must be 3 or 4 letters' },
        { status: 400 }
      )
    }
    
    console.log('=== AIRPORT BY CODE ENDPOINT ===')
    console.log('Airport code request:', { pathCode: upperCode })
    
    // Determine if it's IATA (3 chars) or ICAO (4 chars)
    const iata = upperCode.length === 3 ? upperCode : null
    const icao = upperCode.length === 4 ? upperCode : null
    
    let airport = null
    let cached = false
    
    // Try cache first
    const cachedResult = await airportCache.get(upperCode)
    if (cachedResult) {
      airport = cachedResult.data
      cached = true
    } else {
      // Call external API
      const airports = await fetchFromApiNinjas(iata, icao)
      airport = airports[0] || null
      
      // Cache the result
      if (airport) {
        if (airport.iata) await airportCache.set(airport.iata, airport)
        if (airport.icao) await airportCache.set(airport.icao, airport)
      }
    }
    
    if (!airport) {
      return NextResponse.json(
        { error: 'Airport not found' },
        { status: 404 }
      )
    }
    
    // Return airport data directly for compatibility with frontend
    return NextResponse.json(airport)
    
  } catch (error) {
    console.error('Error in airport by code API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { Router } from 'express'
import { airportCache } from '../services/airportCache.js'
import type { Airport } from '../../types/airport.js'

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

export function createAirportRoutes() {
  const router = Router()

  // Initialize airport cache if not already done
  airportCache.initialize().catch(console.error)

  // Airport by code API - handle path params like /api/airports/ATL
  router.get('/:code([A-Z]{3,4})', async (req, res, next) => {
    try {
      const { code: pathCode } = req.params
      
      if (!pathCode) {
        return res.status(400).json({ 
          error: 'Airport code is required' 
        })
      }

      const upperCode = pathCode.toUpperCase()
      
      console.log('=== PATH ENDPOINT ===')
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
      
      res.json({
        airport,
        source: cached ? 'cache' : 'api',
        cached
      })
      
    } catch (error) {
      next(error)
    }
  })

  // Airport search API - handle query params
  router.get('/', async (req, res, next) => {
    try {
      const { iata, icao } = req.query
      
      console.log('=== SEARCH ENDPOINT ===')
      console.log('Query params:', { iata, icao })
      
      // Return error if no valid code provided
      if (!iata && !icao) {
        return res.status(400).json({ 
          error: 'IATA or ICAO code required. Use ?iata=CODE or ?icao=CODE' 
        })
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
      res.json({
        airport: airports[0] || null,
        source: cached ? 'cache' : 'api',
        cached
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
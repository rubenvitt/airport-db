import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    // Re-enable TanStack Start plugin
    tanstackStart(),
    // Custom API middleware with Redis caching
    {
      name: 'api-middleware',
      configureServer(server) {
        // Import Redis services dynamically
        let airportCache: any = null
        let concurrencyManager: any = null
        let initialized = false

        async function ensureInitialized() {
          if (!initialized) {
            try {
              const cacheModule = await import('./src/server/services/airportCache')
              const concurrencyModule = await import('./src/server/services/concurrencyManager')
              airportCache = cacheModule.airportCache
              concurrencyManager = concurrencyModule.concurrencyManager
              await airportCache.initialize()
              initialized = true
            } catch (error) {
              console.warn('Redis services not available, using fallback mode:', error)
              initialized = true // Mark as initialized to avoid retries
            }
          }
        }

        // Airport by code API - handle path params like /api/airports/ATL (must come before general /api/airports)
        server.middlewares.use(async (req, res, next) => {
          if (req.method === 'GET' && req.url?.startsWith('/api/airports/')) {
            await ensureInitialized()
            
            const url = new URL(req.url!, `http://${req.headers.host}`)
            const pathname = url.pathname
            
            console.log('=== PATH MIDDLEWARE ===')
            console.log('Raw request:', { method: req.method, url: req.url, pathname })
            
            // Extract airport code from path like /api/airports/ATL
            const pathMatch = pathname.match(/^\/api\/airports\/([A-Z]{3,4})$/i)
            const pathCode = pathMatch ? pathMatch[1].toUpperCase() : null
            
            console.log('Path analysis:', { pathMatch, pathCode })
            
            // If no path code, this might be the search endpoint
            if (!pathCode) {
              console.log('No path code found, calling next()')
              next()
              return
            }
            
            // Determine if it's IATA (3 chars) or ICAO (4 chars)
            const iata = pathCode.length === 3 ? pathCode : null
            const icao = pathCode.length === 4 ? pathCode : null
            
            console.log('Airport code request:', { pathCode, iata, icao })
            
            try {
              let airport = null
              let cached = false
              
              // Try cache first
              if (airportCache) {
                const cachedResult = await airportCache.get(pathCode)
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
              } else {
                // No cache - call API directly
                const airports = await fetchFromApiNinjas(iata, icao)
                airport = airports[0] || null
              }
              
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                airport,
                source: cached ? 'cache' : 'api',
                cached
              }))
              
            } catch (error) {
              console.error('Airport API error:', error)
              res.statusCode = 500
              res.end(JSON.stringify({ error: error.message || 'Internal server error' }))
            }
          } else {
            next()
          }
        })

        // Airport search API - handle query params
        server.middlewares.use('/api/airports', async (req, res, next) => {
          if (req.method === 'GET') {
            await ensureInitialized()
            
            const url = new URL(req.url!, `http://${req.headers.host}`)
            
            console.log('=== SEARCH MIDDLEWARE ===')
            console.log('Raw request:', { method: req.method, url: req.url, pathname: url.pathname })
            
            // Get parameters from query string
            const iata = url.searchParams.get('iata')
            const icao = url.searchParams.get('icao')
            
            console.log('Query params:', { iata, icao })
            
            // Return error if no valid code provided
            if (!iata && !icao) {
              console.log('No valid params, returning 400')
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ 
                error: 'IATA or ICAO code required. Use ?iata=CODE or ?icao=CODE' 
              }))
              return
            }
            
            try {
              let airports = []
              let cached = false
              
              const code = iata || icao
              
              // Try cache first
              if (airportCache && code) {
                const cachedResult = await airportCache.get(code)
                if (cachedResult) {
                  airports = [cachedResult.data]
                  cached = true
                } else {
                  // Call external API
                  airports = await fetchFromApiNinjas(iata, icao)
                  
                  // Cache the result
                  if (airports.length > 0) {
                    const airport = airports[0]
                    if (airport.iata) await airportCache.set(airport.iata, airport)
                    if (airport.icao) await airportCache.set(airport.icao, airport)
                  }
                }
              } else {
                // No cache - call API directly
                airports = await fetchFromApiNinjas(iata, icao)
              }
              
              res.setHeader('Content-Type', 'application/json')
              
              // For single airport requests, return the airport directly
              if (code) {
                res.end(JSON.stringify({
                  airport: airports[0] || null,
                  source: cached ? 'cache' : 'api',
                  cached
                }))
              } else {
                // For search requests, return array
                res.end(JSON.stringify({
                  airports,
                  source: cached ? 'cache' : 'api',
                  cached
                }))
              }
            } catch (error) {
              console.error('Airport API error:', error)
              res.statusCode = 500
              res.end(JSON.stringify({ error: error.message || 'Internal server error' }))
            }
          } else {
            next()
          }
        })

        // Helper function to call API Ninjas
        async function fetchFromApiNinjas(iata, icao) {
          // Load environment variables explicitly
          const API_NINJAS_URL = 'https://api.api-ninjas.com/v1'
          const API_NINJAS_KEY = 'yCht2E3WowDAz3v2Hn28BQ==7hYVDsQwPCIwiGBN' // From .env file
          
          console.log('API Ninjas request:', { iata, icao, hasKey: !!API_NINJAS_KEY })
          
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

        // Cache stats API
        server.middlewares.use('/api/cache-stats', async (req, res, next) => {
          if (req.method === 'GET') {
            await ensureInitialized()
            
            try {
              const stats = airportCache ? await airportCache.getStats() : {
                hits: 0, misses: 0, errors: 0, lastReset: Date.now()
              }
              
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(stats))
            } catch (error) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Failed to get cache stats' }))
            }
          } else {
            next()
          }
        })
      }
    }
  ],
  server: {
    headers: {
      // Security headers for development
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Remove unsafe-inline and unsafe-eval in production
        "style-src 'self' 'unsafe-inline'", // Note: Remove unsafe-inline in production
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://opensky-network.org https://api.api-ninjas.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      // Additional security headers
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Permitted-Cross-Domain-Policies': 'none',
    },
  },
})

export default config

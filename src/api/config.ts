// API configuration

export const API_CONFIG = {
  // API Ninjas configuration
  apiNinjas: {
    baseUrl: process.env.NEXT_PUBLIC_API_NINJAS_API_URL || 'https://api.api-ninjas.com/v1',
    key: process.env.NEXT_PUBLIC_API_NINJAS_API_KEY || process.env.NEXT_PUBLIC_API_NINJAS_KEY || '',
    endpoints: {
      airports: '/airports',
    },
  },
  
  // OpenSky Network configuration
  openSky: {
    baseUrl: process.env.NEXT_PUBLIC_OPENSKY_API_URL || 'https://opensky-network.org/api',
    authUrl: process.env.NEXT_PUBLIC_OPENSKY_AUTH_URL || 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
    // OAuth2 credentials (new method - handled server-side)
    clientId: process.env.NEXT_PUBLIC_OPENSKY_CLIENT_ID || '',
    clientSecret: process.env.NEXT_PUBLIC_OPENSKY_CLIENT_SECRET || '',
    // Legacy Basic Auth (deprecated)
    username: process.env.NEXT_PUBLIC_OPENSKY_USERNAME || '',
    password: process.env.NEXT_PUBLIC_OPENSKY_PASSWORD || '',
    endpoints: {
      allStates: '/states/all',
      ownStates: '/states/own',
      tracks: '/tracks/all',
      flights: {
        aircraft: '/flights/aircraft',
        arrival: '/flights/arrival',
        departure: '/flights/departure',
      },
    },
  },
  
  // Optional AviationStack configuration
  aviationStack: {
    baseUrl: 'http://api.aviationstack.com/v1',
    key: process.env.NEXT_PUBLIC_AVIATIONSTACK_KEY || '',
    endpoints: {
      airports: '/airports',
      flights: '/flights',
      airlines: '/airlines',
      airplanes: '/airplanes',
    },
  },
}

// Helper to check if API keys are configured
export const hasApiKey = {
  apiNinjas: () => !!API_CONFIG.apiNinjas.key,
  openSky: () => {
    // Check for OAuth2 credentials first, then fall back to Basic Auth
    const hasOAuth2 = !!(API_CONFIG.openSky.clientId && API_CONFIG.openSky.clientSecret)
    const hasBasicAuth = !!(API_CONFIG.openSky.username && API_CONFIG.openSky.password)
    return hasOAuth2 || hasBasicAuth
  },
  aviationStack: () => !!API_CONFIG.aviationStack.key,
}
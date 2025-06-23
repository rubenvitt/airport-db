// API configuration

export const API_CONFIG = {
  // API Ninjas configuration
  apiNinjas: {
    baseUrl: import.meta.env.VITE_API_NINJAS_API_URL || 'https://api.api-ninjas.com/v1',
    key: import.meta.env.VITE_API_NINJAS_API_KEY || import.meta.env.VITE_API_NINJAS_KEY || '',
    endpoints: {
      airports: '/airports',
    },
  },
  
  // OpenSky Network configuration
  openSky: {
    baseUrl: import.meta.env.VITE_OPENSKY_API_URL || 'https://opensky-network.org/api',
    username: import.meta.env.VITE_OPENSKY_USERNAME || '',
    password: import.meta.env.VITE_OPENSKY_PASSWORD || '',
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
    key: import.meta.env.VITE_AVIATIONSTACK_KEY || '',
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
  openSky: () => !!(API_CONFIG.openSky.username && API_CONFIG.openSky.password),
  aviationStack: () => !!API_CONFIG.aviationStack.key,
}
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Airport } from '@/types'

// Types for our global state
interface FavoriteAirport {
  iata: string
  icao: string
  name: string
  city: string
  country: string
  addedAt: string
}

interface FavoriteFlight {
  callsign: string
  icao24: string
  origin_country: string
  addedAt: string
}

interface SearchHistoryItem {
  query: string
  type: 'airport' | 'flight'
  timestamp: string
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  mapStyle: 'standard' | 'satellite' | 'terrain'
  units: 'metric' | 'imperial'
  defaultView: 'map' | 'list' | 'split'
}

interface MapState {
  center: [number, number]
  zoom: number
  selectedAirport: Airport | null
}

interface AppState {
  // Favorites
  favoriteAirports: FavoriteAirport[]
  favoriteFlights: FavoriteFlight[]
  
  // Search
  searchHistory: SearchHistoryItem[]
  recentAirports: Airport[]
  
  // Map State
  mapState: MapState
  
  // UI State
  userPreferences: UserPreferences
  isSidebarOpen: boolean
  activeView: 'airports' | 'flights' | 'weather' | 'statistics'
  
  // Loading states
  isLoading: boolean
  error: string | null
}

interface AppContextType extends AppState {
  // Favorite actions
  addFavoriteAirport: (airport: Omit<FavoriteAirport, 'addedAt'>) => void
  removeFavoriteAirport: (iata: string) => void
  isFavoriteAirport: (iata: string) => boolean
  
  addFavoriteFlight: (flight: Omit<FavoriteFlight, 'addedAt'>) => void
  removeFavoriteFlight: (icao24: string) => void
  isFavoriteFlight: (icao24: string) => boolean
  
  clearAllFavorites: () => void
  
  // Search actions
  addToSearchHistory: (query: string, type: 'airport' | 'flight') => void
  clearSearchHistory: () => void
  addRecentAirport: (airport: Airport) => void
  
  // Preference actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  toggleTheme: () => void
  
  // Map actions
  updateMapCenter: (center: [number, number]) => void
  updateMapZoom: (zoom: number) => void
  setSelectedAirport: (airport: Airport | null) => void
  updateMapState: (state: Partial<MapState>) => void
  
  // UI actions
  toggleSidebar: () => void
  setActiveView: (view: AppState['activeView']) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// Default state
const defaultState: AppState = {
  favoriteAirports: [],
  favoriteFlights: [],
  searchHistory: [],
  recentAirports: [],
  mapState: {
    center: [39.8283, -98.5795], // Center of USA
    zoom: 4,
    selectedAirport: null,
  },
  userPreferences: {
    theme: 'system',
    mapStyle: 'standard',
    units: 'metric',
    defaultView: 'split',
  },
  isSidebarOpen: true,
  activeView: 'airports',
  isLoading: false,
  error: null,
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined)

// Local storage keys
const STORAGE_KEYS = {
  FAVORITE_AIRPORTS: 'favoriteAirports',
  FAVORITE_FLIGHTS: 'favoriteFlights',
  SEARCH_HISTORY: 'searchHistory',
  RECENT_AIRPORTS: 'recentAirports',
  MAP_STATE: 'mapState',
  USER_PREFERENCES: 'userPreferences',
  SIDEBAR_STATE: 'sidebarOpen',
} as const

// Provider component
export function AppProvider({ children }: { children: React.ReactNode }) {
  // Initialize state from localStorage
  const [state, setState] = useState<AppState>(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return defaultState
    }
    
    const savedState: Partial<AppState> = {}
    
    // Load favorites
    const savedAirports = localStorage.getItem(STORAGE_KEYS.FAVORITE_AIRPORTS)
    if (savedAirports) {
      savedState.favoriteAirports = JSON.parse(savedAirports)
    }
    
    const savedFlights = localStorage.getItem(STORAGE_KEYS.FAVORITE_FLIGHTS)
    if (savedFlights) {
      savedState.favoriteFlights = JSON.parse(savedFlights)
    }
    
    // Load search history
    const savedHistory = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY)
    if (savedHistory) {
      savedState.searchHistory = JSON.parse(savedHistory)
    }
    
    // Load recent airports
    const savedRecent = localStorage.getItem(STORAGE_KEYS.RECENT_AIRPORTS)
    if (savedRecent) {
      savedState.recentAirports = JSON.parse(savedRecent)
    }
    
    // Load map state
    const savedMapState = localStorage.getItem(STORAGE_KEYS.MAP_STATE)
    if (savedMapState) {
      savedState.mapState = JSON.parse(savedMapState)
    }
    
    // Load preferences
    const savedPreferences = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES)
    if (savedPreferences) {
      savedState.userPreferences = JSON.parse(savedPreferences)
    }
    
    // Load sidebar state
    const savedSidebar = localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE)
    if (savedSidebar) {
      savedState.isSidebarOpen = JSON.parse(savedSidebar)
    }
    
    return { ...defaultState, ...savedState }
  })
  
  // Persist state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FAVORITE_AIRPORTS, JSON.stringify(state.favoriteAirports))
    }
  }, [state.favoriteAirports])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.FAVORITE_FLIGHTS, JSON.stringify(state.favoriteFlights))
    }
  }, [state.favoriteFlights])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(state.searchHistory))
    }
  }, [state.searchHistory])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.RECENT_AIRPORTS, JSON.stringify(state.recentAirports))
    }
  }, [state.recentAirports])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.MAP_STATE, JSON.stringify(state.mapState))
    }
  }, [state.mapState])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(state.userPreferences))
    }
  }, [state.userPreferences])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_STATE, JSON.stringify(state.isSidebarOpen))
    }
  }, [state.isSidebarOpen])
  
  // Action implementations
  const addFavoriteAirport = useCallback((airport: Omit<FavoriteAirport, 'addedAt'>) => {
    setState(prev => ({
      ...prev,
      favoriteAirports: [
        ...prev.favoriteAirports.filter(a => a.iata !== airport.iata),
        { ...airport, addedAt: new Date().toISOString() }
      ]
    }))
  }, [])
  
  const removeFavoriteAirport = useCallback((iata: string) => {
    setState(prev => ({
      ...prev,
      favoriteAirports: prev.favoriteAirports.filter(a => a.iata !== iata)
    }))
  }, [])
  
  const isFavoriteAirport = useCallback((iata: string) => {
    return state.favoriteAirports.some(a => a.iata === iata)
  }, [state.favoriteAirports])
  
  const addFavoriteFlight = useCallback((flight: Omit<FavoriteFlight, 'addedAt'>) => {
    setState(prev => ({
      ...prev,
      favoriteFlights: [
        ...prev.favoriteFlights.filter(f => f.icao24 !== flight.icao24),
        { ...flight, addedAt: new Date().toISOString() }
      ]
    }))
  }, [])
  
  const removeFavoriteFlight = useCallback((icao24: string) => {
    setState(prev => ({
      ...prev,
      favoriteFlights: prev.favoriteFlights.filter(f => f.icao24 !== icao24)
    }))
  }, [])
  
  const isFavoriteFlight = useCallback((icao24: string) => {
    return state.favoriteFlights.some(f => f.icao24 === icao24)
  }, [state.favoriteFlights])
  
  const clearAllFavorites = useCallback(() => {
    setState(prev => ({
      ...prev,
      favoriteAirports: [],
      favoriteFlights: []
    }))
  }, [])
  
  const addToSearchHistory = useCallback((query: string, type: 'airport' | 'flight') => {
    setState(prev => {
      const newItem: SearchHistoryItem = {
        query,
        type,
        timestamp: new Date().toISOString()
      }
      
      // Keep only last 20 items, remove duplicates
      const filtered = prev.searchHistory
        .filter(item => item.query !== query || item.type !== type)
        .slice(0, 19)
      
      return {
        ...prev,
        searchHistory: [newItem, ...filtered]
      }
    })
  }, [])
  
  const clearSearchHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchHistory: []
    }))
  }, [])
  
  const addRecentAirport = useCallback((airport: Airport) => {
    setState(prev => {
      // Keep only last 10 airports, remove duplicates
      const filtered = prev.recentAirports
        .filter(a => a.iata !== airport.iata)
        .slice(0, 9)
      
      return {
        ...prev,
        recentAirports: [airport, ...filtered]
      }
    })
  }, [])
  
  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    setState(prev => ({
      ...prev,
      userPreferences: {
        ...prev.userPreferences,
        ...preferences
      }
    }))
  }, [])
  
  const toggleTheme = useCallback(() => {
    setState(prev => {
      const themes: Array<UserPreferences['theme']> = ['light', 'dark', 'system']
      const currentIndex = themes.indexOf(prev.userPreferences.theme)
      const nextIndex = (currentIndex + 1) % themes.length
      
      return {
        ...prev,
        userPreferences: {
          ...prev.userPreferences,
          theme: themes[nextIndex]
        }
      }
    })
  }, [])
  
  const toggleSidebar = useCallback(() => {
    setState(prev => ({
      ...prev,
      isSidebarOpen: !prev.isSidebarOpen
    }))
  }, [])
  
  const setActiveView = useCallback((view: AppState['activeView']) => {
    setState(prev => ({
      ...prev,
      activeView: view
    }))
  }, [])
  
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading
    }))
  }, [])
  
  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error
    }))
  }, [])
  
  // Map action implementations
  const updateMapCenter = useCallback((center: [number, number]) => {
    setState(prev => ({
      ...prev,
      mapState: {
        ...prev.mapState,
        center
      }
    }))
  }, [])
  
  const updateMapZoom = useCallback((zoom: number) => {
    setState(prev => ({
      ...prev,
      mapState: {
        ...prev.mapState,
        zoom
      }
    }))
  }, [])
  
  const setSelectedAirport = useCallback((airport: Airport | null) => {
    setState(prev => ({
      ...prev,
      mapState: {
        ...prev.mapState,
        selectedAirport: airport
      }
    }))
  }, [])
  
  const updateMapState = useCallback((mapState: Partial<MapState>) => {
    setState(prev => ({
      ...prev,
      mapState: {
        ...prev.mapState,
        ...mapState
      }
    }))
  }, [])
  
  const value: AppContextType = {
    ...state,
    addFavoriteAirport,
    removeFavoriteAirport,
    isFavoriteAirport,
    addFavoriteFlight,
    removeFavoriteFlight,
    isFavoriteFlight,
    clearAllFavorites,
    addToSearchHistory,
    clearSearchHistory,
    addRecentAirport,
    updatePreferences,
    toggleTheme,
    updateMapCenter,
    updateMapZoom,
    setSelectedAirport,
    updateMapState,
    toggleSidebar,
    setActiveView,
    setLoading,
    setError,
  }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Export specific hooks for common use cases
export function useFavorites() {
  const context = useApp()
  return {
    favoriteAirports: context.favoriteAirports,
    favoriteFlights: context.favoriteFlights,
    addFavoriteAirport: context.addFavoriteAirport,
    removeFavoriteAirport: context.removeFavoriteAirport,
    isFavoriteAirport: context.isFavoriteAirport,
    addFavoriteFlight: context.addFavoriteFlight,
    removeFavoriteFlight: context.removeFavoriteFlight,
    isFavoriteFlight: context.isFavoriteFlight,
    clearAllFavorites: context.clearAllFavorites,
  }
}

export function usePreferences() {
  const context = useApp()
  return {
    preferences: context.userPreferences,
    updatePreferences: context.updatePreferences,
    toggleTheme: context.toggleTheme,
  }
}

export function useSearchHistory() {
  const context = useApp()
  return {
    searchHistory: context.searchHistory,
    recentAirports: context.recentAirports,
    addToSearchHistory: context.addToSearchHistory,
    clearSearchHistory: context.clearSearchHistory,
    addRecentAirport: context.addRecentAirport,
  }
}

export function useMapState() {
  const context = useApp()
  return {
    mapState: context.mapState,
    updateMapCenter: context.updateMapCenter,
    updateMapZoom: context.updateMapZoom,
    setSelectedAirport: context.setSelectedAirport,
    updateMapState: context.updateMapState,
  }
}
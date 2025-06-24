import React, { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react';
import type { Airport } from '@/types/airport'

interface AirportMarker {
  airport: Airport
  isSelected: boolean
}

interface AirportExplorerState {
  // Map state
  mapCenter: [number, number]
  mapZoom: number
  markers: Array<AirportMarker>
  
  // Search state
  searchQuery: string
  searchResults: Array<Airport>
  searchHistory: Array<string>
  isSearching: boolean
  
  // Filter state
  filters: {
    country?: string
    region?: string
    minElevation?: number
    maxElevation?: number
  }
  
  // Saved locations
  savedAirports: Array<Airport>
  
  // Comparison state
  comparisonAirports: Array<Airport>
  isComparisonMode: boolean
}

interface AirportExplorerContextType extends AirportExplorerState {
  // Map actions
  setMapCenter: (center: [number, number]) => void
  setMapZoom: (zoom: number) => void
  addMarker: (airport: Airport) => void
  removeMarker: (iataCode: string) => void
  selectMarker: (iataCode: string) => void
  clearMarkers: () => void
  
  // Search actions
  setSearchQuery: (query: string) => void
  setSearchResults: (results: Array<Airport>) => void
  addToSearchHistory: (query: string) => void
  clearSearchHistory: () => void
  setIsSearching: (isSearching: boolean) => void
  
  // Filter actions
  setFilters: (filters: Partial<AirportExplorerState['filters']>) => void
  clearFilters: () => void
  
  // Saved locations actions
  saveAirport: (airport: Airport) => void
  unsaveAirport: (iataCode: string) => void
  isSavedAirport: (iataCode: string) => boolean
  
  // Comparison actions
  addToComparison: (airport: Airport) => void
  removeFromComparison: (iataCode: string) => void
  clearComparison: () => void
  toggleComparisonMode: () => void
  isInComparison: (iataCode: string) => boolean
}

const AirportExplorerContext = createContext<AirportExplorerContextType | undefined>(undefined)

export const useAirportExplorer = () => {
  const context = useContext(AirportExplorerContext)
  if (!context) {
    throw new Error('useAirportExplorer must be used within AirportExplorerProvider')
  }
  return context
}

interface AirportExplorerProviderProps {
  children: ReactNode
}

export const AirportExplorerProvider: React.FC<AirportExplorerProviderProps> = ({ children }) => {
  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0])
  const [mapZoom, setMapZoom] = useState(2)
  const [markers, setMarkers] = useState<Array<AirportMarker>>([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<Airport>>([])
  const [searchHistory, setSearchHistory] = useState<Array<string>>(() => {
    const saved = localStorage.getItem('airportSearchHistory')
    return saved ? JSON.parse(saved) : []
  })
  const [isSearching, setIsSearching] = useState(false)
  
  // Filter state
  const [filters, setFiltersState] = useState<AirportExplorerState['filters']>({})
  
  // Saved locations
  const [savedAirports, setSavedAirports] = useState<Array<Airport>>(() => {
    const saved = localStorage.getItem('savedAirports')
    return saved ? JSON.parse(saved) : []
  })
  
  // Comparison state
  const [comparisonAirports, setComparisonAirports] = useState<Array<Airport>>([])
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  
  // Map actions
  const addMarker = (airport: Airport) => {
    setMarkers(prev => [...prev, { airport, isSelected: false }])
  }
  
  const removeMarker = (iataCode: string) => {
    setMarkers(prev => prev.filter(m => m.airport.iata !== iataCode))
  }
  
  const selectMarker = (iataCode: string) => {
    setMarkers(prev =>
      prev.map(m => ({
        ...m,
        isSelected: m.airport.iata === iataCode
      }))
    )
  }
  
  const clearMarkers = () => {
    setMarkers([])
  }
  
  // Search actions
  const addToSearchHistory = (query: string) => {
    const updatedHistory = [query, ...searchHistory.filter(q => q !== query)].slice(0, 10)
    setSearchHistory(updatedHistory)
    localStorage.setItem('airportSearchHistory', JSON.stringify(updatedHistory))
  }
  
  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('airportSearchHistory')
  }
  
  // Filter actions
  const setFilters = (newFilters: Partial<AirportExplorerState['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }
  
  const clearFilters = () => {
    setFiltersState({})
  }
  
  // Saved locations actions
  const saveAirport = (airport: Airport) => {
    const updated = [...savedAirports, airport]
    setSavedAirports(updated)
    localStorage.setItem('savedAirports', JSON.stringify(updated))
  }
  
  const unsaveAirport = (iataCode: string) => {
    const updated = savedAirports.filter(a => a.iata !== iataCode)
    setSavedAirports(updated)
    localStorage.setItem('savedAirports', JSON.stringify(updated))
  }
  
  const isSavedAirport = (iataCode: string) => {
    return savedAirports.some(a => a.iata === iataCode)
  }
  
  // Comparison actions
  const addToComparison = (airport: Airport) => {
    if (comparisonAirports.length < 4) {
      setComparisonAirports(prev => [...prev, airport])
    }
  }
  
  const removeFromComparison = (iataCode: string) => {
    setComparisonAirports(prev => prev.filter(a => a.iata !== iataCode))
  }
  
  const clearComparison = () => {
    setComparisonAirports([])
    setIsComparisonMode(false)
  }
  
  const toggleComparisonMode = () => {
    setIsComparisonMode(prev => !prev)
    if (isComparisonMode) {
      clearComparison()
    }
  }
  
  const isInComparison = (iataCode: string) => {
    return comparisonAirports.some(a => a.iata === iataCode)
  }
  
  const value: AirportExplorerContextType = {
    // State
    mapCenter,
    mapZoom,
    markers,
    searchQuery,
    searchResults,
    searchHistory,
    isSearching,
    filters,
    savedAirports,
    comparisonAirports,
    isComparisonMode,
    
    // Actions
    setMapCenter,
    setMapZoom,
    addMarker,
    removeMarker,
    selectMarker,
    clearMarkers,
    setSearchQuery,
    setSearchResults,
    addToSearchHistory,
    clearSearchHistory,
    setIsSearching,
    setFilters,
    clearFilters,
    saveAirport,
    unsaveAirport,
    isSavedAirport,
    addToComparison,
    removeFromComparison,
    clearComparison,
    toggleComparisonMode,
    isInComparison,
  }
  
  return (
    <AirportExplorerContext.Provider value={value}>
      {children}
    </AirportExplorerContext.Provider>
  )
}
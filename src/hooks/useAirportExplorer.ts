import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Airport } from '@/types'
import { useAirportByIATA, useAirportByICAO } from '@/hooks/api'
import { useApp, useFavorites, useMapState, useSearchHistory } from '@/contexts/AppContext'
import { useComparison } from '@/contexts/ComparisonContext'

interface UseAirportExplorerOptions {
  initialCode?: string
}

export function useAirportExplorer({ initialCode = '' }: UseAirportExplorerOptions = {}) {
  const [searchQuery, setSearchQuery] = useState(initialCode)
  const [localSelectedAirport, setLocalSelectedAirport] = useState<Airport | null>(null)
  
  // Global state hooks
  const { favoriteAirports, addFavoriteAirport, removeFavoriteAirport, isFavoriteAirport } = useFavorites()
  const { searchHistory, recentAirports, addToSearchHistory, addRecentAirport } = useSearchHistory()
  const { mapState, setSelectedAirport: setGlobalSelectedAirport, updateMapState, updateMapCenter, updateMapZoom } = useMapState()
  const { setLoading, setError } = useApp()
  const { addToComparison, removeFromComparison, isInComparison, comparisonAirports, canAddMore } = useComparison()
  
  // Determine if we have a valid search code
  const isValidIATA = searchQuery.length === 3 && /^[A-Z]{3}$/i.test(searchQuery)
  const isValidICAO = searchQuery.length === 4 && /^[A-Z]{4}$/i.test(searchQuery)
  
  // API queries
  const {
    data: airportByIATA,
    isLoading: isLoadingIATA,
    error: errorIATA,
  } = useAirportByIATA(searchQuery.toUpperCase(), {
    enabled: isValidIATA,
  })
  
  const {
    data: airportByICAO,
    isLoading: isLoadingICAO,
    error: errorICAO,
  } = useAirportByICAO(searchQuery.toUpperCase(), {
    enabled: isValidICAO,
  })
  
  // Combine results
  const isLoading = isLoadingIATA || isLoadingICAO
  const error = errorIATA || errorICAO
  const searchResult = airportByIATA || airportByICAO
  const searchResults = searchResult ? [searchResult] : []
  
  // The selected airport is either from global state or local state
  const selectedAirport = mapState.selectedAirport || localSelectedAirport
  
  // Update global loading and error states
  useEffect(() => {
    setLoading(isLoading)
    setError(error ? 'Failed to search airports' : null)
  }, [isLoading, error, setLoading, setError])
  
  // Sync search results with selected airport and global state
  useEffect(() => {
    if (searchResult && !isLoading) {
      // Update both local and global state
      setLocalSelectedAirport(searchResult)
      setGlobalSelectedAirport(searchResult)
      addRecentAirport(searchResult)
      
      // Update map to center on the found airport
      if (searchResult.latitude && searchResult.longitude) {
        updateMapState({
          center: [searchResult.latitude, searchResult.longitude],
          zoom: 13,
          selectedAirport: searchResult
        })
      }
    }
  }, [searchResult, isLoading, setGlobalSelectedAirport, addRecentAirport, updateMapState])
  
  // Handle search query changes
  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query)
    
    // Clear selection if search is cleared
    if (!query) {
      setLocalSelectedAirport(null)
      setGlobalSelectedAirport(null)
    }
    
    // Add to search history if valid
    if ((query.length === 3 || query.length === 4) && /^[A-Z]{3,4}$/i.test(query)) {
      addToSearchHistory(query.toUpperCase(), 'airport')
    }
  }, [setGlobalSelectedAirport, addToSearchHistory])
  
  // Handle airport selection from any component
  const handleAirportSelect = useCallback((airport: Airport | null) => {
    // Update both local and global state
    setLocalSelectedAirport(airport)
    setGlobalSelectedAirport(airport)
    
    if (airport) {
      // Add to recent airports
      addRecentAirport(airport)
      
      // Center map on selected airport
      if (airport.latitude && airport.longitude) {
        updateMapState({
          center: [airport.latitude, airport.longitude],
          zoom: 13,
          selectedAirport: airport
        })
      }
    }
  }, [setGlobalSelectedAirport, addRecentAirport, updateMapState])
  
  // Handle favorite toggle
  const toggleFavorite = useCallback((airport: Airport) => {
    if (isFavoriteAirport(airport.iata)) {
      removeFavoriteAirport(airport.iata)
    } else {
      addFavoriteAirport({
        iata: airport.iata,
        icao: airport.icao,
        name: airport.name,
        city: airport.city,
        country: airport.country,
      })
    }
  }, [isFavoriteAirport, addFavoriteAirport, removeFavoriteAirport])
  
  // Handle comparison toggle
  const toggleComparison = useCallback((airport: Airport) => {
    if (isInComparison(airport.icao)) {
      removeFromComparison(airport.icao)
    } else {
      addToComparison(airport)
    }
  }, [isInComparison, addToComparison, removeFromComparison])
  
  // Handle map interactions
  const handleMapClick = useCallback((lat: number, lng: number) => {
    // This could be extended to add new locations or perform geocoding
    console.log('Map clicked at:', lat, lng)
  }, [])
  
  const handleMarkerDragEnd = useCallback((airport: Airport, newLat: number, newLng: number) => {
    // This could be extended to update airport location in a custom list
    console.log('Marker dragged:', airport.iata, 'to', newLat, newLng)
  }, [])
  
  // Get display airports based on view mode
  const getDisplayAirports = useCallback((viewMode: 'search' | 'favorites' | 'recent') => {
    switch (viewMode) {
      case 'favorites':
        // In a real app, we'd need to fetch full airport data for favorites
        // For now, we'll filter from search results or recent airports
        const favoriteIatas = favoriteAirports.map(f => f.iata)
        return recentAirports.filter(a => favoriteIatas.includes(a.iata))
      case 'recent':
        return recentAirports
      default:
        return searchResults
    }
  }, [searchResults, recentAirports, favoriteAirports])
  
  // Computed values
  const favoriteAirportCodes = useMemo(() => favoriteAirports.map(f => f.iata), [favoriteAirports])
  const hasResults = searchResults.length > 0
  const hasSelection = selectedAirport !== null
  
  return {
    // Search state
    searchQuery,
    setSearchQuery: handleSearchQueryChange,
    searchResults,
    isLoading,
    error,
    hasResults,
    
    // Selection state
    selectedAirport,
    setSelectedAirport: handleAirportSelect,
    hasSelection,
    
    // Favorites
    favoriteAirports,
    favoriteAirportCodes,
    isFavoriteAirport,
    toggleFavorite,
    
    // Comparison
    comparisonAirports,
    isInComparison,
    toggleComparison,
    canAddMore,
    
    // History
    searchHistory,
    recentAirports,
    
    // Map state
    mapState,
    updateMapCenter,
    updateMapZoom,
    updateMapState,
    
    // Display helpers
    getDisplayAirports,
    
    // Event handlers
    handleMapClick,
    handleMarkerDragEnd,
  }
}
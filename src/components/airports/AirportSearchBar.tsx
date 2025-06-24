import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Filter, History, MapPin, Search, X } from 'lucide-react'
import type { Airport } from '@/types/airport'
import { useAirportExplorer } from '@/contexts/AirportExplorerContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common'
import { useDebounce } from '@/hooks/use-debounce'

interface AirportSearchBarProps {
  onAirportSelect?: (airport: Airport) => void
  showFilters?: boolean
  className?: string
}

export const AirportSearchBar: React.FC<AirportSearchBarProps> = ({
  onAirportSelect,
  showFilters = false,
  className = '',
}) => {
  const {
    searchQuery,
    setSearchQuery,
    searchHistory,
    addToSearchHistory,
    clearSearchHistory,
    isSearching,
    setIsSearching,
    searchResults,
    setSearchResults,
  } = useAirportExplorer()
  
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  
  const debouncedQuery = useDebounce(localQuery, 300)
  
  // Mock search function - in a real app this would call the API
  const searchAirports = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock results based on query
    const mockResults: Array<Airport> = [
      {
        icao: 'KLAX',
        iata: 'LAX',
        name: 'Los Angeles International Airport',
        city: 'Los Angeles',
        region: 'California',
        country: 'United States',
        elevation_ft: 125,
        latitude: 33.9425,
        longitude: -118.4081,
        timezone: 'America/Los_Angeles',
      },
      {
        icao: 'KJFK',
        iata: 'JFK',
        name: 'John F Kennedy International Airport',
        city: 'New York',
        region: 'New York',
        country: 'United States',
        elevation_ft: 13,
        latitude: 40.6398,
        longitude: -73.7789,
        timezone: 'America/New_York',
      },
      {
        icao: 'EGLL',
        iata: 'LHR',
        name: 'London Heathrow Airport',
        city: 'London',
        region: 'England',
        country: 'United Kingdom',
        elevation_ft: 83,
        latitude: 51.4706,
        longitude: -0.4619,
        timezone: 'Europe/London',
      },
    ].filter(airport => 
      airport.name.toLowerCase().includes(query.toLowerCase()) ||
      airport.iata.toLowerCase().includes(query.toLowerCase()) ||
      airport.icao.toLowerCase().includes(query.toLowerCase()) ||
      airport.city.toLowerCase().includes(query.toLowerCase())
    )
    
    setSearchResults(mockResults)
    setIsSearching(false)
  }, [setIsSearching, setSearchResults])
  
  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      searchAirports(debouncedQuery)
    } else {
      setSearchResults([])
    }
  }, [debouncedQuery, searchAirports])
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setLocalQuery(value)
    setSearchQuery(value)
    setShowSuggestions(true)
    setSelectedIndex(-1)
  }
  
  const handleSelectAirport = (airport: Airport) => {
    setLocalQuery(airport.name)
    setSearchQuery(airport.name)
    setShowSuggestions(false)
    addToSearchHistory(airport.name)
    
    if (onAirportSelect) {
      onAirportSelect(airport)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const suggestions = searchResults.length > 0 ? searchResults : 
      (searchHistory.length > 0 && !localQuery ? searchHistory.map(h => ({ name: h } as any)) : [])
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          handleSelectAirport(searchResults[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        inputRef.current?.blur()
        break
    }
  }
  
  const handleClear = () => {
    setLocalQuery('')
    setSearchQuery('')
    setSearchResults([])
    inputRef.current?.focus()
  }
  
  const showHistory = searchHistory.length > 0 && !localQuery && showSuggestions
  const showResults = searchResults.length > 0 && localQuery && showSuggestions
  
  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search airports by name, city, or code..."
            className="pl-10 pr-10"
          />
          {localQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {showFilters && (
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {(showHistory || showResults || isSearching) && (
        <Card
          ref={suggestionsRef}
          className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-auto"
        >
          {isSearching && (
            <div className="p-4 flex items-center justify-center">
              <LoadingSpinner text="Searching airports..." />
            </div>
          )}
          
          {showHistory && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <History className="h-3 w-3" />
                  Recent searches
                </span>
                <button
                  onClick={clearSearchHistory}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setLocalQuery(item)
                    setSearchQuery(item)
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent rounded-md text-sm"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
          
          {showResults && (
            <div className="p-2">
              {searchResults.map((airport, index) => (
                <button
                  key={airport.iata}
                  onClick={() => handleSelectAirport(airport)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-3 hover:bg-accent rounded-md transition-colors ${
                    selectedIndex === index ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{airport.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {airport.city}, {airport.country}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Badge variant="secondary">{airport.iata}</Badge>
                      <Badge variant="outline">{airport.icao}</Badge>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {!isSearching && localQuery && searchResults.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No airports found matching "{localQuery}"
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
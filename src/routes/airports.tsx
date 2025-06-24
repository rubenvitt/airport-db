import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAirportByIATA, useAirportByICAO } from '@/hooks/api'
import { LoadingSpinner, ErrorMessage, EmptyState } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Globe, Navigation, Plane } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { MapView, AirportSearchBar, LocationList } from '@/components/airports'
import { useFavorites, useSearchHistory } from '@/contexts/AppContext'
import type { Airport } from '@/types'

export const Route = createFileRoute('/airports')({
  component: AirportsExplorer,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: search.code as string | undefined,
    }
  },
})

function AirportsExplorer() {
  const searchParams = Route.useSearch() as { code?: string }
  const initialCode = searchParams.code || ''
  const [searchQuery, setSearchQuery] = useState(initialCode)
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  
  const { favoriteAirports, addFavoriteAirport, removeFavoriteAirport, isFavoriteAirport } = useFavorites()
  const { addToSearchHistory, addRecentAirport } = useSearchHistory()
  
  // For free tier, we can only search by IATA code (3 letters) or ICAO code (4 letters)
  const isValidIATA = searchQuery.length === 3 && /^[A-Z]{3}$/i.test(searchQuery)
  const isValidICAO = searchQuery.length === 4 && /^[A-Z]{4}$/i.test(searchQuery)
  
  // Search by IATA code
  const {
    data: airportByIATA,
    isLoading: isLoadingIATA,
    error: errorIATA,
  } = useAirportByIATA(searchQuery.toUpperCase(), {
    enabled: isValidIATA,
  })
  
  // Search by ICAO code
  const {
    data: airportByICAO,
    isLoading: isLoadingICAO,
    error: errorICAO,
  } = useAirportByICAO(searchQuery.toUpperCase(), {
    enabled: isValidICAO,
  })
  
  // Combine results and states
  const isLoading = isLoadingIATA || isLoadingICAO
  const error = errorIATA || errorICAO
  const airport = airportByIATA || airportByICAO
  const airports = airport ? [airport] : []
  
  // Auto-select airport when search result changes
  useEffect(() => {
    if (airport && !isLoading) {
      setSelectedAirport(airport)
      addRecentAirport(airport)
    }
  }, [airport, isLoading, addRecentAirport])
  
  // Add to search history when searching
  useEffect(() => {
    if (searchQuery && (isValidIATA || isValidICAO)) {
      addToSearchHistory(searchQuery, 'airport')
    }
  }, [searchQuery, isValidIATA, isValidICAO, addToSearchHistory])

  // Helper functions for favorites
  const getFavoriteAirports = (): string[] => {
    return favoriteAirports.map(f => f.iata)
  }

  const toggleFavorite = (airport: Airport) => {
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
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Airport Explorer</h1>
        </div>
        <p className="text-muted-foreground">
          Search for airports worldwide by their IATA or ICAO codes. 
          Get detailed information including location, elevation, and timezone.
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Airports</CardTitle>
          <CardDescription>
            Enter an IATA (3-letter) or ICAO (4-letter) airport code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AirportSearchBar
            onSearch={setSearchQuery}
            placeholder="Search by IATA or ICAO code..."
            defaultValue={initialCode}
            isLoading={isLoading}
            autoFocus={!initialCode}
          />
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">Popular airports to try:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Los Angeles', iata: 'LAX', icao: 'KLAX' },
                { name: 'New York JFK', iata: 'JFK', icao: 'KJFK' },
                { name: 'London Heathrow', iata: 'LHR', icao: 'EGLL' },
                { name: 'Tokyo Haneda', iata: 'HND', icao: 'RJTT' },
                { name: 'Dubai', iata: 'DXB', icao: 'OMDB' },
                { name: 'Singapore', iata: 'SIN', icao: 'WSSS' },
              ].map((airport) => (
                <div key={airport.iata} className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(airport.iata)}
                    className="h-7"
                  >
                    {airport.iata}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(airport.icao)}
                    className="h-7"
                  >
                    {airport.icao}
                  </Button>
                  <span className="text-xs text-muted-foreground self-center ml-1">
                    {airport.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Map and Location List Section */}
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MapView
            airports={airports}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            height="600px"
            showControls
          />
        </div>
        <div className="lg:col-span-1">
          <LocationList
            airports={airports}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            title="Search Results"
            height="600px"
            emptyMessage={searchQuery ? "No airports found matching your search" : "Search for airports to see them listed here"}
            favoriteAirports={getFavoriteAirports()}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      </div>

      {/* Error and Loading States */}
      {error && (
        <ErrorMessage
          title="Search Error"
          message="Unable to search airports. Please try again."
          error={error}
          showDetails
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Searching airports..." />
        </div>
      )}
    </div>
  )
}

// Add missing Button import
import { Button } from '@/components/ui/button'
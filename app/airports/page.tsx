'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { ErrorMessage } from '../../src/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Badge } from '../../src/components/ui/badge'
import { Button } from '../../src/components/ui/button'
import { AirportSearchBar, LazyMapView, LocationList } from '../../src/components/airports'
import { ComparisonButton } from '../../src/components/airports/ComparisonButton'
import { ComparisonPanel } from '../../src/components/airports/ComparisonPanel'
import { useAirportExplorer } from '../../src/hooks/useAirportExplorer'
import { useComparisonShortcuts } from '../../src/hooks/useComparisonShortcuts'

export default function AirportsExplorer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('code') || searchParams.get('q') || ''
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)
  
  // Use the centralized airport explorer hook for better data flow management
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading,
    error,
    selectedAirport,
    setSelectedAirport,
    favoriteAirportCodes,
    toggleFavorite,
    mapState,
  } = useAirportExplorer({ initialCode })
  
  // Update URL when search query changes
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) {
      params.set('q', searchQuery)
    }
    const query = params.toString()
    router.replace(`/airports${query ? `?${query}` : ''}`, { scroll: false })
  }, [searchQuery, router])
  
  // Add keyboard shortcuts for comparison
  useComparisonShortcuts(selectedAirport, isComparisonOpen, setIsComparisonOpen)

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
            value={searchQuery}
            placeholder="Search by IATA or ICAO code..."
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
                    onClick={() => {
                      console.log('Button clicked, setting searchQuery to:', airport.iata)
                      setSearchQuery(airport.iata)
                    }}
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
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Airport Map</CardTitle>
                  <CardDescription className="text-sm">
                    Click on markers to view airport details
                  </CardDescription>
                </div>
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  Interactive Map
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <LazyMapView
                airports={searchResults}
                selectedAirport={selectedAirport}
                onAirportSelect={setSelectedAirport}
                height="525px"
                showControls
                useGlobalState={true}
              />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <LocationList
            airports={searchResults}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            title="Search Results"
            height="600px"
            emptyMessage={searchQuery ? "No airports found matching your search" : "Search for airports to see them listed here"}
            favoriteAirports={favoriteAirportCodes}
            onToggleFavorite={toggleFavorite}
            useGlobalState={true}
            showTabs={false}
            isLoading={isLoading}
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

      {/* Comparison Button */}
      <ComparisonButton onClick={() => setIsComparisonOpen(true)} />
      
      {/* Comparison Panel */}
      <ComparisonPanel open={isComparisonOpen} onOpenChange={setIsComparisonOpen} />
    </div>
  )
}
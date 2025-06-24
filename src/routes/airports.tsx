import { Link, createFileRoute  } from '@tanstack/react-router'
import { useState } from 'react'
import { GitCompare, Globe, LayoutGrid, List, MapIcon, MapPin, Navigation, Plane, Search } from 'lucide-react'
import type { Airport } from '@/types/airport'
import { useAirportByIATA, useAirportByICAO } from '@/hooks/api'
import { EmptyState, ErrorMessage, LoadingSpinner, SearchBar } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AirportExplorerProvider, useAirportExplorer } from '@/contexts/AirportExplorerContext'
import { AirportComparison, AirportList, AirportMap, AirportSearchBar } from '@/components/airports'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/airports')({
  component: () => (
    <AirportExplorerProvider>
      <AirportsExplorer />
    </AirportExplorerProvider>
  ),
})

function AirportsExplorer() {
  const [activeView, setActiveView] = useState<'map' | 'grid'>('map')
  const {
    searchQuery,
    setSearchQuery,
    addMarker,
    isComparisonMode,
    toggleComparisonMode,
    comparisonAirports,
    clearComparison,
  } = useAirportExplorer()
  
  // For API search - only search by IATA code (3 letters) or ICAO code (4 letters)
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
  const searchResults = airport ? [airport] : []
  
  const handleAirportSelect = (selectedAirport: Airport) => {
    addMarker(selectedAirport)
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Airport Explorer</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="comparison-mode"
                checked={isComparisonMode}
                onCheckedChange={toggleComparisonMode}
              />
              <Label htmlFor="comparison-mode" className="cursor-pointer">
                Compare Mode
              </Label>
            </div>
            {isComparisonMode && comparisonAirports.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearComparison}
              >
                Clear Comparison ({comparisonAirports.length})
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Explore airports worldwide with interactive maps, search, and comparison features.
        </p>
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <AirportSearchBar
          onAirportSelect={handleAirportSelect}
          showFilters
          className="max-w-2xl"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map/Grid View */}
        <div className="lg:col-span-2">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'map' | 'grid')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapIcon className="h-4 w-4" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Grid View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="map" className="mt-0">
              <AirportMap height="600px" />
            </TabsContent>
            
            <TabsContent value="grid" className="mt-0">
              {/* API Search Results */}
              {isLoading && (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex justify-center">
                      <LoadingSpinner text="Searching airports..." />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {error && (
                <ErrorMessage
                  title="Search Error"
                  message="Unable to search airports. Please try again."
                  error={error}
                  showDetails
                />
              )}
              
              {searchResults.length > 0 && (
                <AirportList
                  airports={searchResults}
                  title="Search Results"
                  description="Airports matching your search"
                  onAirportClick={handleAirportSelect}
                />
              )}
              
              {!isLoading && !error && searchResults.length === 0 && searchQuery && (
                <Card>
                  <CardContent className="py-12">
                    <EmptyState
                      title="No airports found"
                      message={`No airport found with code "${searchQuery}". Try searching with a valid IATA or ICAO code.`}
                      icon={MapPin}
                    />
                  </CardContent>
                </Card>
              )}
              
              {!searchQuery && (
                <Card>
                  <CardContent className="py-12">
                    <EmptyState
                      title="Search for airports"
                      message="Enter an IATA (3-letter) or ICAO (4-letter) airport code to get started"
                      icon={Search}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar - Saved Airports */}
        <div className="lg:col-span-1">
          <AirportList
            title="Saved Airports"
            description="Your favorite airports for quick access"
            showRemoveButton
          />
        </div>
      </div>
      
      {/* Comparison Panel */}
      {isComparisonMode && comparisonAirports.length > 0 && (
        <AirportComparison className="mt-6" />
      )}
    </div>
  )
}
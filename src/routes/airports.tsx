import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAirportByIATA, useAirportByICAO } from '@/hooks/api'
import { LoadingSpinner, ErrorMessage, SearchBar, EmptyState } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Globe, Navigation, Plane } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/airports')({
  component: AirportsExplorer,
})

function AirportsExplorer() {
  const [searchQuery, setSearchQuery] = useState('')
  
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
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Try LAX, KLAX, JFK, KJFK, LHR, EGLL..."
            isLoading={isLoading}
            autoFocus
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

      {/* Results Section */}
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

      {airports && airports.length > 0 && (
        <div className="space-y-4">
          {airports.map((airport) => (
            <Card
              key={`${airport.iata}-${airport.icao}`}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {airport.name}
                      <Link
                        to="/airports/$iataCode"
                        params={{ iataCode: airport.iata }}
                        className="text-primary hover:underline"
                      >
                        <Navigation className="h-5 w-5" />
                      </Link>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {airport.city}, {airport.region}, {airport.country}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="text-base">{airport.iata}</Badge>
                    <Badge variant="secondary" className="text-base">{airport.icao}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Coordinates</p>
                      <p className="font-medium">
                        {airport.latitude.toFixed(6)}°, {airport.longitude.toFixed(6)}°
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Elevation</p>
                      <p className="font-medium">{airport.elevation_ft.toLocaleString()} ft</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Timezone</p>
                      <p className="font-medium">{airport.timezone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Location Type</p>
                      <p className="font-medium capitalize">International Airport</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Quick Actions</p>
                      <div className="flex flex-col gap-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${airport.latitude},${airport.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <Globe className="h-4 w-4" />
                          View on Google Maps
                        </a>
                        <Link
                          to="/flights"
                          search={{ airport: airport.iata }}
                          className="inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          <Plane className="h-4 w-4" />
                          View Live Flights
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(isValidIATA || isValidICAO) && airports && airports.length === 0 && !isLoading && (
        <EmptyState
          title="No airport found"
          message={`No airport found with code "${searchQuery}". Please check the code and try again.`}
          icon={MapPin}
        />
      )}

      {!searchQuery && (
        <EmptyState
          title="Search for an airport"
          message="Enter an IATA or ICAO code above to get started"
          icon={MapPin}
        />
      )}
    </div>
  )
}

// Add missing Button import
import { Button } from '@/components/ui/button'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Globe, Map, MapPin, Plane } from 'lucide-react'
import { useState } from 'react'
import { useAirportByIATA, useAirportByICAO } from '@/hooks/api'
import { ErrorMessage, LoadingSpinner } from '@/components/common'
import { AirportSearchBar } from '@/components/airports'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
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
      {/* Hero Section */}
      <div className="text-center mb-12 space-y-4">
        <div className="flex justify-center items-center gap-2 mb-4">
          <Plane className="h-12 w-12 text-primary" />
          <h1 className="text-4xl md:text-5xl font-bold">Airport Database</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore airports worldwide and track live flights in real-time.
          Search by IATA (3-letter) or ICAO (4-letter) airport codes.
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search Airports</CardTitle>
          <CardDescription>
            Find airports by IATA (3-letter) or ICAO (4-letter) code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AirportSearchBar
            onSearch={setSearchQuery}
            placeholder="Search by IATA or ICAO code..."
            isLoading={isLoading}
            autoFocus
          />
          <p className="text-sm text-muted-foreground mt-2">
            💡 Free tier: Search by IATA (e.g., BER, LAX) or ICAO (e.g., EDDB, KLAX) codes only.
            Premium features like searching by name or city are not available.
          </p>
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
          <h2 className="text-2xl font-semibold">
            Found {airports.length} airport{airports.length !== 1 ? 's' : ''}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {airports.map((airport) => (
              <Link
                key={`${airport.iata}-${airport.icao}`}
                to="/airports"
                search={{ code: airport.iata }}
                className="block"
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{airport.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {airport.city}, {airport.region}, {airport.country}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{airport.iata}</Badge>
                      <Badge variant="secondary">{airport.icao}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Elevation</p>
                      <p className="font-medium">{airport.elevation_ft.toLocaleString()} ft</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Timezone</p>
                      <p className="font-medium">{airport.timezone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Coordinates</p>
                      <p className="font-medium">
                        {airport.latitude.toFixed(4)}°, {airport.longitude.toFixed(4)}°
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Click to view</p>
                      <p className="font-medium flex items-center gap-1">
                        <Map className="h-3 w-3" />
                        Interactive Map
                      </p>
                    </div>
                  </div>
                </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(isValidIATA || isValidICAO) && airports && airports.length === 0 && !isLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">
              No airports found for "{searchQuery}". Try a different search term.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Features Section */}
      {!searchQuery && (
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <Plane className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Live Flight Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track flights in real-time with data from OpenSky Network.
                See current positions, altitude, and speed.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Airport Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access detailed information for over 30,000 airports worldwide
                including coordinates, elevation, and timezones.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Globe className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Interactive Maps</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Visualize airports and flights on interactive maps.
                Filter by location, airline, or flight status.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
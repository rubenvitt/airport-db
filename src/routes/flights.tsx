import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAllFlightStates, useAirportFlights } from '@/hooks/api'
import { LoadingSpinner, ErrorMessage, SearchBar, EmptyState } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plane, Navigation, Clock, MapPin, TrendingUp, AlertCircle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { FlightState } from '@/types/flight'

export const Route = createFileRoute('/flights')({
  component: LiveFlightTracker,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      airport: (search.airport as string) || '',
      filter: (search.filter as string) || 'all',
    }
  },
})

function LiveFlightTracker() {
  const { airport, filter } = Route.useSearch()
  const [selectedAirport, setSelectedAirport] = useState(airport)
  const [flightFilter, setFlightFilter] = useState<'all' | 'arrivals' | 'departures'>(
    filter as 'all' | 'arrivals' | 'departures' || 'all'
  )
  const [refreshInterval, setRefreshInterval] = useState<number | null>(30000) // 30 seconds

  // Get all flight states or filtered by airport
  const {
    data: flightStates,
    isLoading,
    error,
    refetch,
  } = selectedAirport && selectedAirport.length === 3
    ? useAirportFlights(selectedAirport, {
        type: flightFilter === 'all' ? undefined : flightFilter,
        enabled: !!selectedAirport,
      })
    : useAllFlightStates()

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval && !isLoading) {
      const interval = setInterval(() => {
        refetch()
      }, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, refetch, isLoading])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAltitude = (altitude: number | null) => {
    if (!altitude) return 'Ground'
    return `${Math.round(altitude * 3.28084).toLocaleString()} ft`
  }

  const formatSpeed = (velocity: number | null) => {
    if (!velocity) return 'N/A'
    return `${Math.round(velocity * 1.94384)} kts`
  }

  const getFlightStatus = (flight: FlightState) => {
    if (flight.on_ground) return { label: 'On Ground', variant: 'secondary' as const }
    if (!flight.velocity || flight.velocity < 50) return { label: 'Stationary', variant: 'outline' as const }
    if (flight.vertical_rate && flight.vertical_rate > 5) return { label: 'Climbing', variant: 'default' as const }
    if (flight.vertical_rate && flight.vertical_rate < -5) return { label: 'Descending', variant: 'default' as const }
    return { label: 'Cruising', variant: 'default' as const }
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plane className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Live Flight Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={refreshInterval?.toString() || 'off'}
              onValueChange={(value) => setRefreshInterval(value === 'off' ? null : Number(value))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">No refresh</SelectItem>
                <SelectItem value="10000">10 seconds</SelectItem>
                <SelectItem value="30000">30 seconds</SelectItem>
                <SelectItem value="60000">1 minute</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Track flights in real-time with data from OpenSky Network. 
          {selectedAirport ? ` Showing flights for ${selectedAirport}.` : ' Showing all active flights.'}
        </p>
      </div>

      {/* Filters Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filter Flights</CardTitle>
          <CardDescription>
            Search by airport IATA code or view all flights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <SearchBar
                onSearch={setSelectedAirport}
                placeholder="Filter by airport IATA code (e.g., LAX, JFK)"
                isLoading={isLoading}
                value={selectedAirport}
              />
            </div>
            {selectedAirport && (
              <Button
                variant="outline"
                onClick={() => setSelectedAirport('')}
              >
                Clear Filter
              </Button>
            )}
          </div>
          
          {selectedAirport && (
            <div className="flex gap-2">
              <Button
                variant={flightFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFlightFilter('all')}
              >
                All Flights
              </Button>
              <Button
                variant={flightFilter === 'arrivals' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFlightFilter('arrivals')}
              >
                Arrivals Only
              </Button>
              <Button
                variant={flightFilter === 'departures' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFlightFilter('departures')}
              >
                Departures Only
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {error && (
        <ErrorMessage
          title="Unable to load flights"
          message="There was an error loading flight data. Please try again."
          error={error}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Loading live flight data..." />
        </div>
      )}

      {flightStates && flightStates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {flightStates.length} Active Flight{flightStates.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flightStates.slice(0, 50).map((flight) => {
              const status = getFlightStatus(flight)
              return (
                <Card
                  key={flight.icao24}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {flight.callsign?.trim() || flight.icao24}
                          {flight.callsign && (
                            <Link
                              to="/flights/$flightId"
                              params={{ flightId: flight.icao24 }}
                              className="text-primary hover:underline"
                            >
                              <Navigation className="h-4 w-4" />
                            </Link>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {flight.origin_country}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Altitude</p>
                        <p className="font-medium">{formatAltitude(flight.geo_altitude)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Speed</p>
                        <p className="font-medium">{formatSpeed(flight.velocity)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Heading</p>
                        <p className="font-medium">{flight.true_track ? `${Math.round(flight.true_track)}°` : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Contact</p>
                        <p className="font-medium">{formatTime(flight.last_contact)}</p>
                      </div>
                    </div>
                    
                    {flight.vertical_rate && Math.abs(flight.vertical_rate) > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className={`h-4 w-4 ${flight.vertical_rate > 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                        <span className="text-muted-foreground">
                          {Math.abs(Math.round(flight.vertical_rate * 196.85))} ft/min
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
          {flightStates.length > 50 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing first 50 flights of {flightStates.length} total
              </p>
            </div>
          )}
        </div>
      )}

      {flightStates && flightStates.length === 0 && !isLoading && (
        <EmptyState
          title="No flights found"
          message={selectedAirport 
            ? `No active flights found for airport ${selectedAirport}`
            : "No active flights found. This might be due to API limitations or temporary data unavailability."
          }
          icon={Plane}
        />
      )}

      {/* API Info */}
      <Card className="mt-8 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">OpenSky Network API Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This tracker uses the free OpenSky Network API. Anonymous users are limited to 10 calls per day.
            For better performance and more frequent updates, consider registering for a free OpenSky account.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertCircle, Clock, Map, MapPin, Navigation, Plane, Settings } from 'lucide-react'
import type { FlightState } from '@/types/flight'
import { useAirportFlights, useAllFlightStates } from '@/hooks/api'
import { EmptyState, ErrorMessage, LoadingSpinner, SearchBar } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LiveFlightTracker() {
  const [selectedAirport, setSelectedAirport] = useState('')
  const [flightFilter, setFlightFilter] = useState<'all' | 'arrivals' | 'departures'>('all')
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
    : useAllFlightStates({
        refetchInterval: refreshInterval || undefined,
      })

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

  // Extract flight states from response
  // For airport searches, the data is directly an array
  // For all flights, the data is in the states property
  const flights = Array.isArray(flightStates) 
    ? flightStates 
    : (flightStates?.states || [])

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
            <Link href="/flights/map">
              <Button variant="default" size="sm">
                <Map className="h-4 w-4 mr-2" />
                View Map
              </Button>
            </Link>
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
          
          {selectedAirport && selectedAirport.length >= 3 && selectedAirport.length <= 4 && (
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant={flightFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFlightFilter('all')}
                >
                  All Flights Near Airport
                </Button>
                <Link href={`/airports/${selectedAirport}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    title="View arrivals and departures on the airport page"
                  >
                    View Arrivals/Departures →
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Showing flights within ~165km radius. For actual arrivals/departures, visit the airport page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {error && (
        <ErrorMessage
          title="Unable to load flights"
          message="There was an error loading flight data. Please try again."
          error={error as Error}
        />
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Loading live flight data..." />
        </div>
      )}

      {flights && flights.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {flights.length} Active Flight{flights.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flights.slice(0, 50).map((flight, index) => {
              const status = getFlightStatus(flight)
              return (
                <Card
                  key={`${flight.icao24}-${index}`}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {flight.callsign?.trim() || (flight.icao24 ? `Flight ${flight.icao24.toUpperCase()}` : 'Unknown Flight')}
                        </CardTitle>
                        <CardDescription>
                          {flight.origin_country}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">ICAO24</p>
                        <p className="font-mono font-medium">{flight.icao24?.toUpperCase() || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Altitude</p>
                        <p className="font-medium">{formatAltitude(flight.baro_altitude)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Speed</p>
                        <p className="font-medium">{formatSpeed(flight.velocity)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Heading</p>
                        <p className="font-medium">
                          {flight.true_track ? `${Math.round(flight.true_track)}°` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {flight.longitude && flight.latitude && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {flight.latitude.toFixed(3)}, {flight.longitude.toFixed(3)}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Link href={`/flights/${flight.icao24}`} className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <Navigation className="h-3 w-3 mr-1" />
                          Track Flight
                        </Button>
                      </Link>
                      <Link href="/flights/map" className="flex-1">
                        <Button size="sm" variant="default" className="w-full">
                          <Map className="h-3 w-3 mr-1" />
                          View on Map
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
          {flights.length > 50 && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Showing first 50 flights. Use filters to narrow down results.
              </p>
            </div>
          )}
        </div>
      )}

      {flights && flights.length === 0 && !isLoading && (
        <EmptyState
          title="No flights found"
          description={selectedAirport 
            ? `No active flights found for ${selectedAirport}. Try a different airport or clear the filter.`
            : "No active flights found. This might be due to API limitations or no flights in the area."
          }
          icon={Plane}
        />
      )}

      {/* Information Card */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            About Live Flight Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Flight data is provided by the OpenSky Network and updated in real-time. 
            Due to API limitations:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Anonymous users are limited to 100 API requests per day</li>
            <li>Real-time data may have a delay of up to 15 seconds</li>
            <li>Some flights may not have complete information</li>
            <li>Airport filtering is approximate based on location</li>
          </ul>
          <div className="pt-2">
            <Link href="/settings">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure API Credentials
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
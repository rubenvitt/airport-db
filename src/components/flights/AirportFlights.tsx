'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Clock, Plane } from 'lucide-react'
import { useAirportArrivals, useAirportDepartures } from '@/hooks/api/useFlights'
import { flightsFetchApi } from '@/api/flights-fetch'
import { LoadingSpinner } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { DepartureArrival } from '@/types/flight'

interface AirportFlightsProps {
  airportCode: string
  className?: string
}

export function AirportFlights({ airportCode, className }: AirportFlightsProps) {
  const [authStatus, setAuthStatus] = useState<{
    authType: 'oauth2' | 'basic' | 'none'
    isAuthenticated: boolean
  } | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '48h' | '72h'>('24h')
  
  // OpenSky only provides arrival/departure data from previous day or earlier
  const now = Math.floor(Date.now() / 1000)
  const yesterday = now - 86400 // 24 hours ago
  const hours = parseInt(timeRange)
  const begin = yesterday - (hours * 3600)
  const end = yesterday
  
  // Check auth status on mount
  useEffect(() => {
    flightsFetchApi.getAuthStatus()
      .then(setAuthStatus)
      .catch(console.error)
  }, [])
  
  const {
    data: arrivals,
    isLoading: arrivalsLoading,
    error: arrivalsError,
  } = useAirportArrivals(
    airportCode,
    begin,
    end,
    { enabled: !!authStatus?.isAuthenticated }
  )
  
  const {
    data: departures,
    isLoading: departuresLoading,
    error: departuresError,
  } = useAirportDepartures(
    airportCode,
    begin,
    end,
    { enabled: !!authStatus?.isAuthenticated }
  )
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
  
  const renderFlightCard = (flight: DepartureArrival, type: 'arrival' | 'departure') => {
    const isArrival = type === 'arrival'
    const airportCode = isArrival ? flight.estDepartureAirport : flight.estArrivalAirport
    const time = isArrival ? flight.lastSeen : flight.firstSeen
    
    return (
      <Card key={`${flight.icao24}-${time}`} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {isArrival ? (
                  <ArrowDown className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowUp className="h-4 w-4 text-blue-600" />
                )}
                {flight.callsign?.trim() || `Flight ${flight.icao24.toUpperCase()}`}
              </CardTitle>
              <CardDescription>
                {isArrival ? 'From' : 'To'} {airportCode || 'Unknown'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono">
              {flight.icao24.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{formatTime(time)}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{formatDate(time)}</span>
          </div>
          
          {flight.firstSeen && flight.lastSeen && (
            <div className="text-xs text-muted-foreground">
              Flight duration: {formatDuration(flight.lastSeen - flight.firstSeen)}
            </div>
          )}
          
          <div className="flex justify-between items-center pt-2">
            <div className="text-xs text-muted-foreground">
              {isArrival ? 'Arrival' : 'Departure'} confidence: 
              {' '}
              {isArrival 
                ? flight.arrivalAirportCandidatesCount 
                : flight.departureAirportCandidatesCount
              } candidates
            </div>
            <Link href={`/flights/${flight.icao24}`}>
              <Button size="sm" variant="outline">
                Track
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!authStatus?.isAuthenticated) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Authentication Required</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Viewing arrivals and departures requires OpenSky Network authentication.
          </p>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="mt-2">
              Configure Credentials
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    )
  }
  
  const isLoading = arrivalsLoading || departuresLoading
  
  return (
    <div className={className}>
      <Tabs defaultValue="arrivals" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="arrivals">
              <ArrowDown className="h-4 w-4 mr-2" />
              Arrivals
            </TabsTrigger>
            <TabsTrigger value="departures">
              <ArrowUp className="h-4 w-4 mr-2" />
              Departures
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time period:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '24h' | '48h' | '72h')}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="24h">Yesterday</option>
              <option value="48h">Last 2 days</option>
              <option value="72h">Last 3 days</option>
            </select>
          </div>
        </div>
        
        <TabsContent value="arrivals" className="space-y-4">
          {arrivalsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading arrivals</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{arrivalsError instanceof Error ? arrivalsError.message : 'Unknown error'}</p>
                {arrivalsError instanceof Error && arrivalsError.message.includes('404') && (
                  <p className="text-sm">
                    Note: The OpenSky Network only provides arrival/departure data from the previous day or earlier.
                    Data may not be available for all airports. Try a major international airport (e.g., EDDF, EGLL, KJFK).
                  </p>
                )}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading arrivals..." />
            </div>
          ) : arrivals && arrivals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {arrivals.map((flight) => renderFlightCard(flight, 'arrival'))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No arrivals found for the selected time period</p>
              <p className="text-sm mt-2">Note: OpenSky only provides historical data from yesterday or earlier</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="departures" className="space-y-4">
          {departuresError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error loading departures</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{departuresError instanceof Error ? departuresError.message : 'Unknown error'}</p>
                {departuresError instanceof Error && departuresError.message.includes('404') && (
                  <p className="text-sm">
                    Note: The OpenSky Network only provides arrival/departure data from the previous day or earlier.
                    Data may not be available for all airports. Try a major international airport (e.g., EDDF, EGLL, KJFK).
                  </p>
                )}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner text="Loading departures..." />
            </div>
          ) : departures && departures.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {departures.map((flight) => renderFlightCard(flight, 'departure'))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No departures found for the selected time period</p>
              <p className="text-sm mt-2">Note: OpenSky only provides historical data from yesterday or earlier</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
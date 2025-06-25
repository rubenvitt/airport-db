'use client'

import { useParams } from 'next/navigation'
import { useAirportByICAO, useAirportByIATA } from '../../../src/hooks/api'
import { LoadingSpinner, ErrorMessage } from '../../../src/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/card'
import { Badge } from '../../../src/components/ui/badge'
import { MapPin, Globe, Clock, Navigation, Plane } from 'lucide-react'
import Link from 'next/link'

export default function AirportDetailPage() {
  const params = useParams()
  const code = params.code as string
  
  // Determine if it's IATA (3 chars) or ICAO (4 chars)
  const isIATA = code.length === 3
  const isICAO = code.length === 4
  
  // Fetch by appropriate code type
  const { data: airportIATA, isLoading: loadingIATA, error: errorIATA } = useAirportByIATA(
    isIATA ? code : '',
    { enabled: isIATA }
  )
  
  const { data: airportICAO, isLoading: loadingICAO, error: errorICAO } = useAirportByICAO(
    isICAO ? code : '',
    { enabled: isICAO }
  )
  
  const airport = airportIATA || airportICAO
  const isLoading = loadingIATA || loadingICAO
  const error = errorIATA || errorICAO

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner text="Loading airport details..." />
      </div>
    )
  }

  if (error || !airport) {
    return (
      <ErrorMessage
        title="Airport not found"
        message={`Unable to find airport with code ${code}`}
        error={error}
      />
    )
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/airports" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to airports
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{airport.name}</CardTitle>
              <CardDescription className="text-lg mt-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                {airport.city}, {airport.region}, {airport.country}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className="text-lg px-3 py-1">{airport.iata}</Badge>
              <Badge variant="secondary" className="text-lg px-3 py-1">{airport.icao}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4" />
                  Location
                </h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Latitude</dt>
                    <dd className="font-mono">{airport.latitude.toFixed(6)}°</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Longitude</dt>
                    <dd className="font-mono">{airport.longitude.toFixed(6)}°</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Elevation</dt>
                    <dd>{airport.elevation_ft.toLocaleString()} ft</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Time Information
                </h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Timezone</dt>
                    <dd>{airport.timezone}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Navigation className="h-4 w-4" />
                  Quick Actions
                </h3>
                <div className="flex flex-col gap-2">
                  <Link 
                    href={`/flights?airport=${airport.icao}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <Plane className="h-3 w-3" />
                    View departures & arrivals
                  </Link>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${airport.latitude},${airport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" />
                    View on Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* You can add more sections here like weather, runways, etc. */}
    </div>
  )
}
import { Link, createFileRoute, useNavigate  } from '@tanstack/react-router'
import { 
  ArrowLeft, Clock, Compass, Flag, Gauge, Heart, 
  Info, MapPin, Navigation, Plane, RefreshCw, TrendingUp
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFlightByIcao24, useFlightTrack } from '@/hooks/api'
import { ErrorMessage, LoadingSpinner } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/flights/$flightId')({
  component: FlightDetails,
})

function FlightDetails() {
  const { flightId } = Route.useParams()
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  
  const {
    data: flight,
    isLoading,
    error,
    refetch,
  } = useFlightByIcao24(flightId)
  
  const {
    data: trackData,
    isLoading: isLoadingTrack,
  } = useFlightTrack(flightId, {
    enabled: !!flight,
  })
  
  // Check if flight is in favorites
  useEffect(() => {
    const favorites = localStorage.getItem('favoriteFlights')
    if (favorites) {
      const favoriteList = JSON.parse(favorites)
      setIsFavorite(favoriteList.some((fav: any) => fav.icao24 === flightId))
    }
  }, [flightId])
  
  const toggleFavorite = () => {
    const favorites = localStorage.getItem('favoriteFlights')
    let favoriteList = favorites ? JSON.parse(favorites) : []
    
    if (isFavorite) {
      // Remove from favorites
      favoriteList = favoriteList.filter((fav: any) => fav.icao24 !== flightId)
    } else if (flight) {
      // Add to favorites
      favoriteList.push({
        callsign: flight.callsign?.trim() || flight.icao24,
        icao24: flight.icao24,
        origin_country: flight.origin_country,
        addedAt: new Date().toISOString(),
      })
    }
    
    localStorage.setItem('favoriteFlights', JSON.stringify(favoriteList))
    setIsFavorite(!isFavorite)
  }
  
  const handleRefresh = () => {
    refetch()
    setLastRefresh(new Date())
  }
  
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  const formatAltitude = (altitude: number | null) => {
    if (!altitude) return 'Ground'
    return `${Math.round(altitude * 3.28084).toLocaleString()} ft`
  }
  
  const formatSpeed = (velocity: number | null) => {
    if (!velocity) return 'N/A'
    const knots = Math.round(velocity * 1.94384)
    const kmh = Math.round(velocity * 3.6)
    return `${knots} kts / ${kmh} km/h`
  }
  
  const getFlightStatus = (flight: any) => {
    if (flight.on_ground) return { label: 'On Ground', variant: 'secondary' as const, color: 'text-gray-600' }
    if (!flight.velocity || flight.velocity < 50) return { label: 'Stationary', variant: 'outline' as const, color: 'text-gray-600' }
    if (flight.vertical_rate && flight.vertical_rate > 5) return { label: 'Climbing', variant: 'default' as const, color: 'text-green-600' }
    if (flight.vertical_rate && flight.vertical_rate < -5) return { label: 'Descending', variant: 'default' as const, color: 'text-orange-600' }
    return { label: 'Cruising', variant: 'default' as const, color: 'text-blue-600' }
  }
  
  if (isLoading) {
    return (
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="flex justify-center py-12">
          <LoadingSpinner text={`Loading flight ${flightId}...`} />
        </div>
      </div>
    )
  }
  
  if (error || !flight) {
    return (
      <div className="container py-8 max-w-6xl mx-auto">
        <ErrorMessage
          title="Flight not found"
          message={`Unable to find flight with ID "${flightId}". The flight may have landed or the transponder may be offline.`}
          error={error}
          action={
            <Button onClick={() => navigate({ to: '/flights' })} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Flight Tracker
            </Button>
          }
        />
      </div>
    )
  }
  
  const status = getFlightStatus(flight)

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Navigation */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/flights' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Flight Tracker
        </Button>
      </div>

      {/* Flight Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Plane className="h-10 w-10 text-primary" />
              {flight.callsign?.trim() || flight.icao24}
            </h1>
            <p className="text-xl text-muted-foreground flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {flight.origin_country}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant} className="text-lg px-4 py-2">
              {status.label}
            </Badge>
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="icon"
              onClick={toggleFavorite}
              className="ml-2"
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Position */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Current Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Latitude</p>
                <p className="font-medium">{flight.latitude?.toFixed(6) || 'N/A'}°</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Longitude</p>
                <p className="font-medium">{flight.longitude?.toFixed(6) || 'N/A'}°</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Last Contact</p>
              <p className="font-medium">{formatTime(flight.last_contact)}</p>
            </div>
            
            {flight.latitude && flight.longitude && (
              <div className="pt-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${flight.latitude},${flight.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <MapPin className="h-4 w-4" />
                  View Current Position
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flight Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Flight Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Altitude</p>
                <p className="font-medium">{formatAltitude(flight.geo_altitude)}</p>
                {flight.baro_altitude && flight.baro_altitude !== flight.geo_altitude && (
                  <p className="text-xs text-muted-foreground">
                    Barometric: {formatAltitude(flight.baro_altitude)}
                  </p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Speed</p>
                <p className="font-medium">{formatSpeed(flight.velocity)}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Heading</p>
                <p className="font-medium">
                  {flight.true_track ? `${Math.round(flight.true_track)}°` : 'N/A'}
                </p>
              </div>
            </div>
            
            {flight.vertical_rate !== null && flight.vertical_rate !== 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-4 w-4 ${flight.vertical_rate > 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Vertical Rate</p>
                    <p className={`font-medium ${flight.vertical_rate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(Math.round(flight.vertical_rate * 196.85))} ft/min {flight.vertical_rate > 0 ? '↑' : '↓'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">ICAO24 Code</p>
                <p className="font-medium font-mono">{flight.icao24}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Callsign</p>
                <p className="font-medium font-mono">{flight.callsign?.trim() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Squawk Code</p>
                <p className="font-medium font-mono">{flight.squawk || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">SPI Signal</p>
                <p className="font-medium">{flight.spi ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Position Source</p>
                <p className="font-medium">{flight.position_source === 0 ? 'ADS-B' : flight.position_source === 1 ? 'ASTERIX' : flight.position_source === 2 ? 'MLAT' : 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="font-medium">Aircraft Category {flight.category || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time Position</p>
                <p className="font-medium">{flight.time_position ? formatTime(flight.time_position) : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Sensors</p>
                <p className="font-medium">{flight.sensors?.join(', ') || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Track Information */}
        {trackData && trackData.path.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Flight Path</CardTitle>
              <CardDescription>
                Historical track data for this flight
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {trackData.path.length} position reports recorded
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                From: {formatTime(trackData.startTime)} to {formatTime(trackData.endTime)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* API Attribution */}
      <Card className="mt-6 border-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Live flight data provided by OpenSky Network. 
            Data may be delayed by up to 15 seconds for security reasons.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
import { createFileRoute } from '@tanstack/react-router'
import { useAirportByIATA } from '@/hooks/api'
import { LoadingSpinner, ErrorMessage } from '@/components/common'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  MapPin, Globe, Navigation, Plane, Heart, ArrowLeft, 
  Clock, Mountain, Compass, Info, ExternalLink 
} from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/airports/$iataCode')({
  component: AirportDetails,
})

function AirportDetails() {
  const { iataCode } = Route.useParams()
  const navigate = useNavigate()
  const [isFavorite, setIsFavorite] = useState(false)
  
  const {
    data: airport,
    isLoading,
    error,
  } = useAirportByIATA(iataCode.toUpperCase())
  
  // Check if airport is in favorites
  useEffect(() => {
    const favorites = localStorage.getItem('favoriteAirports')
    if (favorites) {
      const favoriteList = JSON.parse(favorites)
      setIsFavorite(favoriteList.some((fav: any) => fav.iata === iataCode.toUpperCase()))
    }
  }, [iataCode])
  
  const toggleFavorite = () => {
    const favorites = localStorage.getItem('favoriteAirports')
    let favoriteList = favorites ? JSON.parse(favorites) : []
    
    if (isFavorite) {
      // Remove from favorites
      favoriteList = favoriteList.filter((fav: any) => fav.iata !== iataCode.toUpperCase())
    } else if (airport) {
      // Add to favorites
      favoriteList.push({
        iata: airport.iata,
        icao: airport.icao,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        addedAt: new Date().toISOString(),
      })
    }
    
    localStorage.setItem('favoriteAirports', JSON.stringify(favoriteList))
    setIsFavorite(!isFavorite)
  }
  
  if (isLoading) {
    return (
      <div className="container py-8 max-w-6xl mx-auto">
        <div className="flex justify-center py-12">
          <LoadingSpinner text={`Loading details for ${iataCode}...`} />
        </div>
      </div>
    )
  }
  
  if (error || !airport) {
    return (
      <div className="container py-8 max-w-6xl mx-auto">
        <ErrorMessage
          title="Airport not found"
          message={`Unable to find airport with IATA code "${iataCode}"`}
          error={error}
          action={
            <Button onClick={() => navigate({ to: '/airports' })} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Airports
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Navigation */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/airports' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Airport Explorer
        </Button>
      </div>

      {/* Airport Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">{airport.name}</h1>
            <p className="text-xl text-muted-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {airport.city}, {airport.region}, {airport.country}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-lg px-4 py-2">{airport.iata}</Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">{airport.icao}</Badge>
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="icon"
              onClick={toggleFavorite}
              className="ml-2"
            >
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Latitude</p>
                <p className="font-medium">{airport.latitude.toFixed(6)}°</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Longitude</p>
                <p className="font-medium">{airport.longitude.toFixed(6)}°</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm text-muted-foreground mb-1">Full Coordinates</p>
              <p className="font-mono text-sm">
                {airport.latitude.toFixed(6)}°, {airport.longitude.toFixed(6)}°
              </p>
            </div>
            
            <div className="pt-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${airport.latitude},${airport.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" />
                View on Google Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Airport Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Airport Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Elevation</p>
                <p className="font-medium">
                  {airport.elevation_ft.toLocaleString()} ft / {Math.round(airport.elevation_ft * 0.3048).toLocaleString()} m
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="font-medium">{airport.timezone}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="font-medium">{airport.region}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Explore more about this airport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Link
                to="/flights"
                search={{ airport: airport.iata }}
                className="flex"
              >
                <Button variant="outline" className="w-full">
                  <Plane className="h-4 w-4 mr-2" />
                  View Live Flights
                </Button>
              </Link>
              
              <a
                href={`https://www.flightradar24.com/airport/${airport.iata.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  FlightRadar24
                </Button>
              </a>
              
              <a
                href={`https://en.wikipedia.org/wiki/${airport.name.replace(/ /g, '_')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Wikipedia
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Country</p>
                <p className="font-medium">{airport.country}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">City</p>
                <p className="font-medium">{airport.city}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">IATA Code</p>
                <p className="font-medium font-mono">{airport.iata}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">ICAO Code</p>
                <p className="font-medium font-mono">{airport.icao}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Attribution */}
      <Card className="mt-6 border-muted">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Airport data provided by API Ninjas. 
            Some features require premium API access.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
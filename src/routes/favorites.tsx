import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common'
import { Heart, MapPin, Plane, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/favorites')({
  component: Favorites,
})

interface FavoriteAirport {
  iata: string
  icao: string
  name: string
  city: string
  country: string
  addedAt: string
}

interface FavoriteFlight {
  callsign: string
  icao24: string
  origin_country: string
  addedAt: string
}

function Favorites() {
  const [favoriteAirports, setFavoriteAirports] = useState<FavoriteAirport[]>([])
  const [favoriteFlights, setFavoriteFlights] = useState<FavoriteFlight[]>([])

  // Load favorites from localStorage on mount
  useEffect(() => {
    const savedAirports = localStorage.getItem('favoriteAirports')
    const savedFlights = localStorage.getItem('favoriteFlights')
    
    if (savedAirports) {
      setFavoriteAirports(JSON.parse(savedAirports))
    }
    
    if (savedFlights) {
      setFavoriteFlights(JSON.parse(savedFlights))
    }
  }, [])

  const removeAirport = (iata: string) => {
    const updated = favoriteAirports.filter(airport => airport.iata !== iata)
    setFavoriteAirports(updated)
    localStorage.setItem('favoriteAirports', JSON.stringify(updated))
  }

  const removeFlight = (icao24: string) => {
    const updated = favoriteFlights.filter(flight => flight.icao24 !== icao24)
    setFavoriteFlights(updated)
    localStorage.setItem('favoriteFlights', JSON.stringify(updated))
  }

  const clearAllFavorites = () => {
    if (confirm('Are you sure you want to clear all favorites?')) {
      setFavoriteAirports([])
      setFavoriteFlights([])
      localStorage.removeItem('favoriteAirports')
      localStorage.removeItem('favoriteFlights')
    }
  }

  const hasFavorites = favoriteAirports.length > 0 || favoriteFlights.length > 0

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Favorites</h1>
          </div>
          {hasFavorites && (
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllFavorites}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          Your favorite airports and flights for quick access
        </p>
      </div>

      {!hasFavorites ? (
        <EmptyState
          title="No favorites yet"
          message="Start adding airports and flights to your favorites for quick access"
          icon={Heart}
          action={
            <div className="flex gap-4 justify-center mt-4">
              <Link to="/airports">
                <Button variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Browse Airports
                </Button>
              </Link>
              <Link to="/flights">
                <Button variant="outline">
                  <Plane className="h-4 w-4 mr-2" />
                  Track Flights
                </Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Favorite Airports */}
          {favoriteAirports.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-6 w-6" />
                Favorite Airports ({favoriteAirports.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {favoriteAirports.map((airport) => (
                  <Card key={airport.iata} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {airport.name}
                          </CardTitle>
                          <CardDescription>
                            {airport.city}, {airport.country}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge>{airport.iata}</Badge>
                          <Badge variant="secondary">{airport.icao}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(airport.addedAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          <Link to="/airports/$iataCode" params={{ iataCode: airport.iata }}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAirport(airport.iata)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Favorite Flights */}
          {favoriteFlights.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Plane className="h-6 w-6" />
                Favorite Flights ({favoriteFlights.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {favoriteFlights.map((flight) => (
                  <Card key={flight.icao24} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {flight.callsign}
                          </CardTitle>
                          <CardDescription>
                            {flight.origin_country}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{flight.icao24}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Added {new Date(flight.addedAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2">
                          <Link to="/flights/$flightId" params={{ flightId: flight.icao24 }}>
                            <Button variant="outline" size="sm">
                              Track Flight
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFlight(flight.icao24)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How to add favorites</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Navigate to any airport or flight detail page and click the heart icon to add it to your favorites.
            Favorites are stored locally in your browser and will persist between sessions.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
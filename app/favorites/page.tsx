'use client'

import { Heart, MapPin, Plane, X } from 'lucide-react'
import Link from 'next/link'
import { useFavoriteAirports } from '../../src/hooks/useFavoriteAirports'
import { useAirportByICAO } from '../../src/hooks/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Button } from '../../src/components/ui/button'
import { Badge } from '../../src/components/ui/badge'
import { LoadingSpinner } from '../../src/components/common'

interface FavoriteAirportCardProps {
  icaoCode: string
  onRemove: (code: string) => void
}

function FavoriteAirportCard({ icaoCode, onRemove }: FavoriteAirportCardProps) {
  const { data: airport, isLoading } = useAirportByICAO(icaoCode)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingSpinner text="Loading..." />
        </CardContent>
      </Card>
    )
  }

  if (!airport) return null

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{airport.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {airport.city}, {airport.region}, {airport.country}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{airport.iata}</Badge>
            <Badge variant="secondary">{airport.icao}</Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(icaoCode)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Link
            href={`/airports/${airport.icao}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <MapPin className="h-3 w-3" />
            View details
          </Link>
          <Link
            href={`/flights?airport=${airport.icao}`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <Plane className="h-3 w-3" />
            View flights
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default function FavoritesPage() {
  const { favoriteAirports, toggleFavorite, isLoading } = useFavoriteAirports()

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Favorite Airports</h1>
        </div>
        <p className="text-muted-foreground">
          Save your frequently accessed airports for quick access. 
          Track flights and view information for your favorite locations.
        </p>
      </div>

      {/* Favorites Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Loading favorites..." />
        </div>
      ) : favoriteAirports.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-4">
              Start adding airports to your favorites to see them here.
            </p>
            <Link href="/airports">
              <Button>
                <MapPin className="h-4 w-4 mr-2" />
                Explore Airports
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favoriteAirports.map((icaoCode) => (
            <FavoriteAirportCard
              key={icaoCode}
              icaoCode={icaoCode}
              onRemove={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {favoriteAirports.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Link href="/airports">
                  <Button variant="outline">
                    <MapPin className="h-4 w-4 mr-2" />
                    Add More Airports
                  </Button>
                </Link>
                <Link href="/flights">
                  <Button variant="outline">
                    <Plane className="h-4 w-4 mr-2" />
                    Track Live Flights
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
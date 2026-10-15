'use client'

import { Heart, MapPin, Plane, X, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useFavoriteAirports } from '../../src/hooks/useFavoriteAirports'
import { useAirportByICAO } from '../../src/hooks/api'
import { useFavorites, useSearchHistory } from '../../src/contexts/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Button } from '../../src/components/ui/button'
import { Badge } from '../../src/components/ui/badge'
import { LoadingSpinner } from '../../src/components/common'
import { LocationList } from '../../src/components/airports'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs'
import type { Airport } from '../../src/types'

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
  const { favoriteAirports: favoriteIcaoCodes, toggleFavorite, isLoading } = useFavoriteAirports()
  const { favoriteAirports } = useFavorites()
  const { recentAirports } = useSearchHistory()
  const [favoriteAirportData, setFavoriteAirportData] = useState<Array<Airport>>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  
  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Fetch full airport data for favorites
  useEffect(() => {
    const fetchFavoriteAirports = async () => {
      setIsDataLoading(true)
      const airportPromises = favoriteIcaoCodes.map(async (icao) => {
        try {
          const response = await fetch(`/api/airports/${icao}`)
          if (response.ok) {
            return await response.json()
          }
        } catch (error) {
          console.error(`Failed to fetch airport ${icao}:`, error)
        }
        return null
      })
      
      const results = await Promise.all(airportPromises)
      const validAirports = results.filter(Boolean) as Array<Airport>
      
      // Merge with recent airports to have full data
      const allAirports = [...validAirports, ...recentAirports]
      const uniqueAirports = Array.from(
        new Map(allAirports.map(a => [a.icao, a])).values()
      )
      
      setFavoriteAirportData(uniqueAirports)
      setIsDataLoading(false)
    }
    
    if (favoriteIcaoCodes.length > 0 || recentAirports.length > 0) {
      fetchFavoriteAirports()
    } else {
      setIsDataLoading(false)
    }
  }, [favoriteIcaoCodes, recentAirports])

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Airports</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your favorite airports and quickly access recently viewed airports. 
          Your favorites are saved and will be available when you return.
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Favorite Airports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isMounted ? favoriteIcaoCodes.length : 0}</div>
            <CardDescription className="mt-1">
              Airports you've starred for quick access
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Recent Airports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isMounted ? recentAirports.length : 0}</div>
            <CardDescription className="mt-1">
              Airports you've viewed recently
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      {isDataLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner text="Loading your airports..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <LocationList
              airports={favoriteAirportData}
              title="My Airports"
              height="600px"
              useGlobalState={true}
              showTabs={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
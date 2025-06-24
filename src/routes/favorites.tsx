import { createFileRoute } from '@tanstack/react-router'
import { Clock, Heart, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Airport } from '@/types'
import { LocationList } from '@/components/airports'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFavorites, useSearchHistory } from '@/contexts/AppContext'
import { useAirportByIATA } from '@/hooks/api'
import { LoadingSpinner } from '@/components/common'

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const { favoriteAirports } = useFavorites()
  const { recentAirports } = useSearchHistory()
  const [favoriteAirportData, setFavoriteAirportData] = useState<Array<Airport>>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch full airport data for favorites
  useEffect(() => {
    const fetchFavoriteAirports = async () => {
      setIsLoading(true)
      const airportPromises = favoriteAirports.map(async (fav) => {
        try {
          const response = await fetch(`/api/airports/${fav.iata}`)
          if (response.ok) {
            return await response.json()
          }
        } catch (error) {
          console.error(`Failed to fetch airport ${fav.iata}:`, error)
        }
        return null
      })
      
      const results = await Promise.all(airportPromises)
      const validAirports = results.filter(Boolean) as Array<Airport>
      
      // Merge with recent airports to have full data
      const allAirports = [...validAirports, ...recentAirports]
      const uniqueAirports = Array.from(
        new Map(allAirports.map(a => [a.iata, a])).values()
      )
      
      setFavoriteAirportData(uniqueAirports)
      setIsLoading(false)
    }
    
    if (favoriteAirports.length > 0 || recentAirports.length > 0) {
      fetchFavoriteAirports()
    } else {
      setIsLoading(false)
    }
  }, [favoriteAirports, recentAirports])
  
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
            <div className="text-2xl font-bold">{favoriteAirports.length}</div>
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
            <div className="text-2xl font-bold">{recentAirports.length}</div>
            <CardDescription className="mt-1">
              Airports you've viewed recently
            </CardDescription>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      {isLoading ? (
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
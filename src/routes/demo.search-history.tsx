import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useSearchHistory, useFavorites } from '@/contexts/AppContext'
import type { Airport } from '@/types'

export const Route = createFileRoute('/demo/search-history')({
  component: SearchHistoryDemo,
})

function SearchHistoryDemo() {
  const { searchHistory, recentAirports, addToSearchHistory, addRecentAirport, clearSearchHistory } = useSearchHistory()
  const { addFavoriteAirport } = useFavorites()

  const sampleAirports: Airport[] = [
    {
      iata: 'LAX',
      icao: 'KLAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      region: 'California',
      country: 'United States',
      elevation_ft: 125,
      latitude: 33.9425,
      longitude: -118.4081,
      timezone: 'America/Los_Angeles',
    },
    {
      iata: 'JFK',
      icao: 'KJFK',
      name: 'John F. Kennedy International Airport',
      city: 'New York',
      region: 'New York',
      country: 'United States',
      elevation_ft: 13,
      latitude: 40.6413,
      longitude: -73.7781,
      timezone: 'America/New_York',
    },
  ]

  const addSampleSearches = () => {
    addToSearchHistory('LAX', 'airport')
    addToSearchHistory('JFK', 'airport')
    addToSearchHistory('LHR', 'airport')
    addToSearchHistory('UA123', 'flight')
    addToSearchHistory('DL456', 'flight')
  }

  const addSampleAirports = () => {
    sampleAirports.forEach(airport => {
      addRecentAirport(airport)
    })
  }

  const addSampleFavorites = () => {
    sampleAirports.forEach(airport => {
      addFavoriteAirport({
        iata: airport.iata,
        icao: airport.icao,
        name: airport.name,
        city: airport.city,
        country: airport.country,
      })
    })
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Search History Demo</h1>
      <p className="text-muted-foreground mb-8">
        This demo helps you test the search history and global state management features.
      </p>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Sample Data</CardTitle>
            <CardDescription>Click the buttons below to add sample data to test the features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={addSampleSearches}>Add Search History</Button>
              <Button onClick={addSampleAirports}>Add Recent Airports</Button>
              <Button onClick={addSampleFavorites}>Add Favorites</Button>
              <Button variant="destructive" onClick={clearSearchHistory}>Clear History</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Search History</CardTitle>
          </CardHeader>
          <CardContent>
            {searchHistory.length === 0 ? (
              <p className="text-muted-foreground">No search history yet</p>
            ) : (
              <ul className="space-y-2">
                {searchHistory.map((item, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span>{item.query} ({item.type})</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Airports</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAirports.length === 0 ? (
              <p className="text-muted-foreground">No recent airports yet</p>
            ) : (
              <ul className="space-y-2">
                {recentAirports.map((airport) => (
                  <li key={airport.iata}>
                    {airport.name} ({airport.iata}) - {airport.city}, {airport.country}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">How to test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Add Search History" to add sample searches</li>
          <li>Click "Add Recent Airports" to add sample airports</li>
          <li>Go to the header and click the clock icon to see the search history dropdown</li>
          <li>Navigate to different pages and see how the state persists</li>
          <li>Refresh the page and see that the data is still there (localStorage)</li>
        </ol>
      </div>
    </div>
  )
}
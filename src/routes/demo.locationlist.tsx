import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { LocationList } from '@/components/airports'
import type { Airport } from '@/types'

export const Route = createFileRoute('/demo/locationlist')({
  component: LocationListDemo,
})

// Sample airport data for demo
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
  {
    iata: 'LHR',
    icao: 'EGLL',
    name: 'London Heathrow Airport',
    city: 'London',
    region: 'England',
    country: 'United Kingdom',
    elevation_ft: 83,
    latitude: 51.4700,
    longitude: -0.4543,
    timezone: 'Europe/London',
  },
  {
    iata: 'NRT',
    icao: 'RJAA',
    name: 'Narita International Airport',
    city: 'Narita',
    region: 'Chiba',
    country: 'Japan',
    elevation_ft: 141,
    latitude: 35.7653,
    longitude: 140.3854,
    timezone: 'Asia/Tokyo',
  },
  {
    iata: 'DXB',
    icao: 'OMDB',
    name: 'Dubai International Airport',
    city: 'Dubai',
    region: 'Dubai',
    country: 'United Arab Emirates',
    elevation_ft: 62,
    latitude: 25.2532,
    longitude: 55.3657,
    timezone: 'Asia/Dubai',
  },
]

function LocationListDemo() {
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  const [airports, setAirports] = useState<Airport[]>(sampleAirports)
  const [favoriteAirports, setFavoriteAirports] = useState<string[]>(['LAX', 'LHR'])

  const handleAirportRemove = (airport: Airport) => {
    setAirports(airports.filter(a => a.iata !== airport.iata))
    if (selectedAirport?.iata === airport.iata) {
      setSelectedAirport(null)
    }
  }

  const handleToggleFavorite = (airport: Airport) => {
    if (favoriteAirports.includes(airport.iata)) {
      setFavoriteAirports(favoriteAirports.filter(iata => iata !== airport.iata))
    } else {
      setFavoriteAirports([...favoriteAirports, airport.iata])
    }
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Location List Component Demo</h1>
      <p className="text-muted-foreground mb-8">
        This demo showcases the LocationList component with search, filter, and sort functionality.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo with all features */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Full Featured Location List</h2>
          <LocationList
            airports={airports}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            onAirportRemove={handleAirportRemove}
            title="Airport Locations"
            showActions={true}
            height="600px"
            favoriteAirports={favoriteAirports}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>

        {/* Simple list without actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Simple Location List</h2>
          <LocationList
            airports={airports}
            selectedAirport={selectedAirport}
            onAirportSelect={setSelectedAirport}
            title="Select an Airport"
            showActions={false}
            height="600px"
          />
        </div>
      </div>

      {/* Selected Airport Info */}
      {selectedAirport && (
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Selected Airport:</h3>
          <p>{selectedAirport.name} ({selectedAirport.iata})</p>
          <p className="text-sm text-muted-foreground">
            {selectedAirport.city}, {selectedAirport.country}
          </p>
        </div>
      )}
    </div>
  )
}
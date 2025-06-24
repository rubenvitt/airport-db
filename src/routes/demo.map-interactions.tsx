import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { MapView } from '@/components/airports'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Info, MapPin, Move, MousePointer2 } from 'lucide-react'
import type { Airport } from '@/types'

export const Route = createFileRoute('/demo/map-interactions')({
  component: MapInteractionsDemo,
})

function MapInteractionsDemo() {
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)
  const [clickedLocation, setClickedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [draggedAirport, setDraggedAirport] = useState<{ airport: Airport; newLat: number; newLng: number } | null>(null)
  const [interactionMode, setInteractionMode] = useState<'normal' | 'click' | 'drag'>('normal')
  
  // Sample airports for the demo
  const [airports, setAirports] = useState<Airport[]>([
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
      iata: 'SFO',
      icao: 'KSFO',
      name: 'San Francisco International Airport',
      city: 'San Francisco',
      region: 'California',
      country: 'United States',
      elevation_ft: 13,
      latitude: 37.6213,
      longitude: -122.3790,
      timezone: 'America/Los_Angeles',
    },
    {
      iata: 'SEA',
      icao: 'KSEA',
      name: 'Seattle-Tacoma International Airport',
      city: 'Seattle',
      region: 'Washington',
      country: 'United States',
      elevation_ft: 433,
      latitude: 47.4502,
      longitude: -122.3088,
      timezone: 'America/Los_Angeles',
    },
  ])

  const handleMapClick = (lat: number, lng: number) => {
    setClickedLocation({ lat, lng })
    
    // Add a temporary marker to show where the user clicked
    const newAirport: Airport = {
      iata: 'NEW',
      icao: 'KNEW',
      name: 'New Location (Click)',
      city: 'Custom',
      region: 'Custom',
      country: 'Custom',
      elevation_ft: 0,
      latitude: lat,
      longitude: lng,
      timezone: 'UTC',
    }
    
    setAirports(prev => [...prev.filter(a => a.iata !== 'NEW'), newAirport])
    setSelectedAirport(newAirport)
  }

  const handleMarkerDragEnd = (airport: Airport, newLat: number, newLng: number) => {
    setDraggedAirport({ airport, newLat, newLng })
    
    // Update the airport's position in the state
    setAirports(prev => prev.map(a => 
      a.iata === airport.iata 
        ? { ...a, latitude: newLat, longitude: newLng }
        : a
    ))
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Map Interactions Demo</h1>
        <p className="text-muted-foreground">
          Explore advanced map interaction features including click to add locations and drag-and-drop markers
        </p>
      </div>

      {/* Interaction Mode Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Interaction Mode</CardTitle>
          <CardDescription>
            Choose how you want to interact with the map
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={interactionMode === 'normal' ? 'default' : 'outline'}
              onClick={() => setInteractionMode('normal')}
              className="gap-2"
            >
              <MousePointer2 className="h-4 w-4" />
              Normal Mode
            </Button>
            <Button
              variant={interactionMode === 'click' ? 'default' : 'outline'}
              onClick={() => setInteractionMode('click')}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Click to Add
            </Button>
            <Button
              variant={interactionMode === 'drag' ? 'default' : 'outline'}
              onClick={() => setInteractionMode('drag')}
              className="gap-2"
            >
              <Move className="h-4 w-4" />
              Drag Markers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <MapView
              airports={airports}
              selectedAirport={selectedAirport}
              onAirportSelect={setSelectedAirport}
              height="600px"
              showControls
              center={[39.8283, -98.5795]}
              zoom={5}
              onMapClick={interactionMode === 'click' ? handleMapClick : undefined}
              allowMarkerDrag={interactionMode === 'drag'}
              onMarkerDragEnd={handleMarkerDragEnd}
            />
          </Card>
        </div>

        {/* Info Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mode Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Current Mode: {interactionMode}</AlertTitle>
            <AlertDescription>
              {interactionMode === 'normal' && 'Click on markers to select airports and view their information.'}
              {interactionMode === 'click' && 'Click anywhere on the map to add a new location marker.'}
              {interactionMode === 'drag' && 'Drag any marker to move it to a new location on the map.'}
            </AlertDescription>
          </Alert>

          {/* Selected Airport Info */}
          {selectedAirport && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Airport</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Name:</span> {selectedAirport.name}
                </div>
                <div>
                  <span className="font-medium">Location:</span> {selectedAirport.city}, {selectedAirport.region}
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedAirport.iata}</Badge>
                  <Badge variant="secondary">{selectedAirport.icao}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Lat: {selectedAirport.latitude.toFixed(4)}, Lng: {selectedAirport.longitude.toFixed(4)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Click Location Info */}
          {clickedLocation && interactionMode === 'click' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Clicked Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Latitude:</span> {clickedLocation.lat.toFixed(6)}
                  </div>
                  <div>
                    <span className="font-medium">Longitude:</span> {clickedLocation.lng.toFixed(6)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    A temporary marker has been added at this location.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Drag Info */}
          {draggedAirport && interactionMode === 'drag' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Last Dragged Marker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Airport:</span> {draggedAirport.airport.name}
                  </div>
                  <div>
                    <span className="font-medium">New Position:</span>
                    <div className="text-sm text-muted-foreground">
                      Lat: {draggedAirport.newLat.toFixed(6)}, Lng: {draggedAirport.newLng.toFixed(6)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Airport List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Airports on Map</CardTitle>
              <CardDescription>
                {airports.length} locations displayed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {airports.map((airport) => (
                  <div
                    key={airport.iata}
                    className={`p-2 rounded border cursor-pointer transition-colors ${
                      selectedAirport?.iata === airport.iata
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedAirport(airport)}
                  >
                    <div className="font-medium">{airport.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {airport.iata} • {airport.city}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
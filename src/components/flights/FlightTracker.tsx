import { useState, useCallback, useEffect } from 'react'
import { Play, Pause, RefreshCw, Settings, Filter, Eye, EyeOff } from 'lucide-react'
import type { FlightState } from '@/types/flight'
import { FlightMapView } from './FlightMapView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFlightData } from '@/hooks/useFlightData'
import { useFlightWebSocketContext } from '@/contexts/FlightWebSocketContext'
import type { FlightBounds } from '@/stores/FlightDataStore'

interface FlightTrackerProps {
  initialCenter?: [number, number]
  initialZoom?: number
  height?: string
}

export function FlightTracker({ 
  initialCenter = [52.5200, 13.4050], // Berlin default
  initialZoom = 6,
  height = '70vh'
}: FlightTrackerProps) {
  // State
  const [selectedFlight, setSelectedFlight] = useState<FlightState | null>(null)
  const [isLive, setIsLive] = useState(true)
  const [maxFlights, setMaxFlights] = useState(1000)
  const [showOnGround, setShowOnGround] = useState(true)
  const [showInFlight, setShowInFlight] = useState(true)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [currentBounds, setCurrentBounds] = useState<FlightBounds | null>(null)
  const [currentZoom, setCurrentZoom] = useState(initialZoom)
  const [autoCenter, setAutoCenter] = useState(false)

  // Hooks
  const flightData = useFlightData({ autoSubscribeToUpdates: isLive })
  const webSocket = useFlightWebSocketContext()

  // Get filtered flights for display
  const filteredFlights = flightData.queryFlights({
    bounds: currentBounds || undefined,
    onGround: showOnGround && showInFlight ? undefined : (showOnGround ? true : false),
    countries: selectedCountries.length > 0 ? selectedCountries : undefined,
  })

  // Get unique countries from all flights for filter dropdown
  const availableCountries = Array.from(
    new Set(flightData.getAllFlights().map(f => f.origin_country))
  ).sort()

  // Handle WebSocket connection
  useEffect(() => {
    if (isLive && !webSocket.isConnected && !webSocket.isConnecting) {
      webSocket.connect()
    }
    
    // Subscribe to area updates when bounds change
    if (isLive && webSocket.isConnected && currentBounds) {
      webSocket.subscribeToArea(currentBounds)
    }
  }, [isLive, webSocket, currentBounds])

  // Handle flight selection
  const handleFlightSelect = useCallback((flight: FlightState) => {
    setSelectedFlight(flight)
    
    if (autoCenter && flight.latitude && flight.longitude) {
      // Center map on selected flight - this would need map ref integration
    }
  }, [autoCenter])

  // Handle map movement
  const handleMapMove = useCallback((bounds: FlightBounds, zoom: number) => {
    setCurrentBounds(bounds)
    setCurrentZoom(zoom)
  }, [])

  // Toggle live tracking
  const toggleLive = useCallback(() => {
    setIsLive(!isLive)
    if (!isLive) {
      webSocket.connect()
    } else {
      webSocket.disconnect()
    }
  }, [isLive, webSocket])

  // Clear all data
  const clearData = useCallback(() => {
    flightData.clear()
    setSelectedFlight(null)
  }, [flightData])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
      {/* Main map view */}
      <div className="lg:col-span-3">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            <FlightMapView
              center={initialCenter}
              zoom={initialZoom}
              height={height}
              onFlightSelect={handleFlightSelect}
              selectedFlight={selectedFlight}
              maxFlightsDisplayed={maxFlights}
              onMapMove={handleMapMove}
            />
          </CardContent>
        </Card>
      </div>

      {/* Controls and info panel */}
      <div className="space-y-4">
        {/* Connection Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                webSocket.isConnected ? 'bg-green-500' : 
                webSocket.isConnecting ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="live-tracking">Live Tracking</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="live-tracking"
                  checked={isLive}
                  onCheckedChange={toggleLive}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={toggleLive}
                >
                  {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Status: {webSocket.isConnected ? 'Connected' : webSocket.isConnecting ? 'Connecting...' : 'Disconnected'}</div>
              <div>Update Rate: {flightData.updateRate.toFixed(1)}/sec</div>
              <div>Total Flights: {flightData.flightCount.toLocaleString()}</div>
              <div>Displayed: {filteredFlights.length.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Flight Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Max flights slider */}
            <div className="space-y-2">
              <Label className="text-xs">Max Flights: {maxFlights.toLocaleString()}</Label>
              <Slider
                value={[maxFlights]}
                onValueChange={(value) => setMaxFlights(value[0])}
                max={5000}
                min={100}
                step={100}
                className="w-full"
              />
            </div>

            {/* Flight status filters */}
            <div className="space-y-2">
              <Label className="text-xs">Flight Status</Label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-in-flight"
                    checked={showInFlight}
                    onCheckedChange={setShowInFlight}
                    size="sm"
                  />
                  <Label htmlFor="show-in-flight" className="text-xs">In Flight</Label>
                </div>
                <Badge variant={showInFlight ? "default" : "secondary"} className="text-xs">
                  {filteredFlights.filter(f => !f.on_ground).length}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="show-on-ground"
                    checked={showOnGround}
                    onCheckedChange={setShowOnGround}
                    size="sm"
                  />
                  <Label htmlFor="show-on-ground" className="text-xs">On Ground</Label>
                </div>
                <Badge variant={showOnGround ? "default" : "secondary"} className="text-xs">
                  {filteredFlights.filter(f => f.on_ground).length}
                </Badge>
              </div>
            </div>

            {/* Country filter */}
            <div className="space-y-2">
              <Label className="text-xs">Countries</Label>
              <Select
                value={selectedCountries.length === 1 ? selectedCountries[0] : ""}
                onValueChange={(value) => setSelectedCountries(value ? [value] : [])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={
                    selectedCountries.length === 0 ? "All Countries" : 
                    selectedCountries.length === 1 ? selectedCountries[0] :
                    `${selectedCountries.length} selected`
                  } />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  {availableCountries.slice(0, 20).map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Selected Flight Info */}
        {selectedFlight && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Selected Flight
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setSelectedFlight(null)}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1 text-xs">
                <div className="font-medium">
                  {selectedFlight.callsign?.trim() || 'Unknown Flight'}
                </div>
                <div className="text-muted-foreground">
                  {selectedFlight.icao24.toUpperCase()}
                </div>
                <div className="text-muted-foreground">
                  {selectedFlight.origin_country}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Altitude</div>
                  <div className="font-mono">
                    {selectedFlight.baro_altitude ? 
                      `${Math.round(selectedFlight.baro_altitude * 3.28084).toLocaleString()} ft` : 
                      'Unknown'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Speed</div>
                  <div className="font-mono">
                    {selectedFlight.velocity ? 
                      `${Math.round(selectedFlight.velocity * 1.94384)} kts` : 
                      'Unknown'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Heading</div>
                  <div className="font-mono">
                    {selectedFlight.true_track ? 
                      `${Math.round(selectedFlight.true_track)}°` : 
                      'Unknown'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <Badge variant={selectedFlight.on_ground ? "secondary" : "default"} className="text-xs">
                    {selectedFlight.on_ground ? 'Ground' : 'Flight'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={clearData}
              className="w-full justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Clear Data
            </Button>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-center" className="text-xs">Auto Center</Label>
              <Switch
                id="auto-center"
                checked={autoCenter}
                onCheckedChange={setAutoCenter}
                size="sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span>{(flightData.metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between">
                <span>Active Flights:</span>
                <span>{flightData.metrics.activeFlights.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Zoom Level:</span>
                <span>{currentZoom.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
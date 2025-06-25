import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Plane, MapPin, Clock, Navigation, Gauge, Timer } from 'lucide-react'
import type { FlightState } from '@/types/flight'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common'
import { useTheme } from '@/hooks/use-theme'
import { useFlightData } from '@/hooks/useFlightData'
import type { FlightBounds } from '@/stores/FlightDataStore'
import 'leaflet/dist/leaflet.css'

export interface FlightMapViewProps {
  center?: [number, number]
  zoom?: number
  height?: string
  showControls?: boolean
  onFlightSelect?: (flight: FlightState) => void
  selectedFlight?: FlightState | null
  bounds?: FlightBounds
  showOnlyBounds?: boolean
  maxFlightsDisplayed?: number
  onMapMove?: (bounds: FlightBounds, zoom: number) => void
}

interface FlightMapClientProps extends FlightMapViewProps {
  MapComponents: any
}

// Flight icon rotation based on heading
function createRotatedFlightIcon(L: any, heading: number, isSelected: boolean = false): any {
  const color = isSelected ? '#ef4444' : '#3b82f6' // red for selected, blue for normal
  const size = isSelected ? 24 : 16
  
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(${heading} 12 12)">
        <path fill="${color}" stroke="white" stroke-width="1" 
              d="M12 2 L16 18 L12 16 L8 18 Z"/>
      </g>
    </svg>
  `
  
  const iconUrl = 'data:image/svg+xml;base64,' + btoa(svgIcon)
  
  return new L.Icon({
    iconUrl,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  })
}

function FlightMapClient({ 
  MapComponents,
  center = [39.8283, -98.5795],
  zoom = 6,
  height = '600px',
  showControls = true,
  onFlightSelect,
  selectedFlight,
  bounds,
  showOnlyBounds = false,
  maxFlightsDisplayed = 1000,
  onMapMove,
}: FlightMapClientProps) {
  const { resolvedTheme } = useTheme()
  const flightData = useFlightData()
  const [mapBounds, setMapBounds] = useState<FlightBounds | null>(null)
  const [displayedFlights, setDisplayedFlights] = useState<FlightState[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const updateTimeoutRef = useRef<NodeJS.Timeout>()

  const { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } = MapComponents
  const L = MapComponents.L

  // Update displayed flights when data changes or bounds change
  useEffect(() => {
    const updateFlights = () => {
      if (isUpdating) return // Prevent multiple simultaneous updates
      
      setIsUpdating(true)
      
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      // Debounce updates to prevent excessive re-renders
      updateTimeoutRef.current = setTimeout(() => {
        let flights: FlightState[]
        
        if (showOnlyBounds && bounds) {
          flights = flightData.queryFlights({ bounds })
        } else if (mapBounds) {
          flights = flightData.queryFlights({ bounds: mapBounds })
        } else {
          flights = flightData.queryFlights()
        }
        
        // Filter out flights without valid coordinates
        flights = flights.filter(f => f.latitude !== null && f.longitude !== null)
        
        // Limit number of displayed flights for performance
        if (flights.length > maxFlightsDisplayed) {
          // Sort by last update time and take the most recent
          flights = flights
            .sort((a, b) => (b.last_contact || 0) - (a.last_contact || 0))
            .slice(0, maxFlightsDisplayed)
        }
        
        setDisplayedFlights(flights)
        setIsUpdating(false)
      }, 100) // 100ms debounce
    }

    updateFlights()
    
    // Subscribe to flight data updates
    const unsubscribe = flightData.onBulkUpdate(() => {
      updateFlights()
    })
    
    return () => {
      unsubscribe()
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [flightData, bounds, showOnlyBounds, mapBounds, maxFlightsDisplayed, isUpdating])

  // Map event handler component
  function MapEventHandler() {
    const map = useMap()
    
    useMapEvents({
      moveend: () => {
        const mapBounds = map.getBounds()
        const newBounds: FlightBounds = {
          lamin: mapBounds.getSouth(),
          lamax: mapBounds.getNorth(),
          lomin: mapBounds.getWest(),
          lomax: mapBounds.getEast(),
        }
        setMapBounds(newBounds)
        onMapMove?.(newBounds, map.getZoom())
      },
      zoomend: () => {
        const mapBounds = map.getBounds()
        const newBounds: FlightBounds = {
          lamin: mapBounds.getSouth(),
          lamax: mapBounds.getNorth(),
          lomin: mapBounds.getWest(),
          lomax: mapBounds.getEast(),
        }
        setMapBounds(newBounds)
        onMapMove?.(newBounds, map.getZoom())
      }
    })
    
    // Set initial bounds
    useEffect(() => {
      const mapBounds = map.getBounds()
      const initialBounds: FlightBounds = {
        lamin: mapBounds.getSouth(),
        lamax: mapBounds.getNorth(),
        lomin: mapBounds.getWest(),
        lomax: mapBounds.getEast(),
      }
      setMapBounds(initialBounds)
    }, [map])
    
    return null
  }

  // Create flight icons with rotation
  const flightIcons = useMemo(() => {
    if (!L) return new Map()
    
    const icons = new Map()
    displayedFlights.forEach(flight => {
      const heading = flight.true_track || 0
      const isSelected = selectedFlight?.icao24 === flight.icao24
      const iconKey = `${Math.round(heading)}-${isSelected}`
      
      if (!icons.has(iconKey)) {
        try {
          icons.set(iconKey, createRotatedFlightIcon(L, heading, isSelected))
        } catch (error) {
          console.warn('Failed to create flight icon:', error)
        }
      }
    })
    
    return icons
  }, [L, displayedFlights, selectedFlight])

  // Format altitude for display
  const formatAltitude = (altitude: number | null): string => {
    if (altitude === null) return 'Unknown'
    return `${Math.round(altitude * 3.28084).toLocaleString()} ft` // Convert meters to feet
  }

  // Format speed for display
  const formatSpeed = (velocity: number | null): string => {
    if (velocity === null) return 'Unknown'
    return `${Math.round(velocity * 1.94384)} kts` // Convert m/s to knots
  }

  // Calculate time since last contact
  const getTimeSinceContact = (lastContact: number): string => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - lastContact
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        preferCanvas={true} // Better performance for many markers
      >
        <TileLayer
          attribution={resolvedTheme === 'dark' 
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          url={resolvedTheme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />
        
        <MapEventHandler />
        
        {/* Flight markers */}
        {displayedFlights.map((flight) => {
          if (flight.latitude === null || flight.longitude === null) return null
          
          const heading = flight.true_track || 0
          const isSelected = selectedFlight?.icao24 === flight.icao24
          const iconKey = `${Math.round(heading)}-${isSelected}`
          const icon = flightIcons.get(iconKey)
          
          return (
            <Marker
              key={flight.icao24}
              position={[flight.latitude, flight.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onFlightSelect?.(flight)
              }}
            >
              <Popup>
                <div className="p-3 min-w-[280px] max-w-[350px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">
                      {flight.callsign?.trim() || 'Unknown Flight'}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      {flight.icao24.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Country:
                      </span>
                      <span>{flight.origin_country}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        Altitude:
                      </span>
                      <span>{formatAltitude(flight.baro_altitude)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        Speed:
                      </span>
                      <span>{formatSpeed(flight.velocity)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        Heading:
                      </span>
                      <span>{flight.true_track ? `${Math.round(flight.true_track)}°` : 'Unknown'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant={flight.on_ground ? "secondary" : "default"} className="text-xs">
                        {flight.on_ground ? 'On Ground' : 'In Flight'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last Contact:
                      </span>
                      <span>{getTimeSinceContact(flight.last_contact)}</span>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Position: {flight.latitude.toFixed(4)}, {flight.longitude.toFixed(4)}
                      </div>
                      {flight.squawk && (
                        <div className="text-xs text-muted-foreground">
                          Squawk: {flight.squawk}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
        
        {/* Custom zoom controls */}
        {showControls && (
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={() => {
                // Access map instance through a ref or context if needed
              }}
              aria-label="Zoom in"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        )}
      </MapContainer>
      
      {/* Flight statistics overlay */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-md p-3 shadow-lg z-[1000]">
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {displayedFlights.length.toLocaleString()} flight{displayedFlights.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-muted-foreground">
            Total tracked: {flightData.flightCount.toLocaleString()}
          </div>
          {flightData.isReceivingUpdates && (
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live updates</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Loading overlay when updating */}
      {isUpdating && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-md px-3 py-2 shadow-lg z-[1000]">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Updating flights...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Main export component
export function FlightMapView(props: FlightMapViewProps) {
  const [mounted, setMounted] = useState(false)
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    const loadMapComponents = async () => {
      try {
        const [L, ReactLeaflet] = await Promise.all([
          import('leaflet'),
          import('react-leaflet')
        ])
        
        // Fix Leaflet's default icon paths
        delete (L.default.Icon.Default.prototype as any)._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: '/leaflet/marker-icon-2x.png',
          iconUrl: '/leaflet/marker-icon.png',
          shadowUrl: '/leaflet/marker-shadow.png',
        })
        
        setMapComponents({ L: L.default, ...ReactLeaflet })
      } catch (error) {
        console.error('Failed to load map components:', error)
      }
    }
    
    loadMapComponents()
  }, [])

  if (!mounted || !MapComponents) {
    return (
      <Card className="overflow-hidden">
        <div className="relative flex items-center justify-center" style={{ height: props.height || '600px' }}>
          <LoadingSpinner text="Loading flight map..." />
        </div>
      </Card>
    )
  }

  return <FlightMapClient {...props} MapComponents={MapComponents} />
}
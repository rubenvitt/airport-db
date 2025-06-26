import { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react'
import { Plane, MapPin, Clock, Navigation, Gauge, Timer } from 'lucide-react'
import type { FlightState } from '@/types/flight'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common'
import { useTheme } from '@/hooks/use-theme'
import { useFlightData } from '@/hooks/useFlightData'
import { useFlightTrack } from '@/hooks/useFlightTrack'
import type { FlightBounds } from '@/stores/FlightDataStore'
import { FlightPath } from './FlightPath'
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
  flights?: FlightState[] // Add flights prop
  onDisplayedFlightsChange?: (count: number) => void // Callback for displayed count
}

interface FlightMapClientProps extends FlightMapViewProps {
  MapComponents: any
}

// Memoized flight marker component for better performance
const FlightMarker = memo(({ 
  flight, 
  icon, 
  onFlightSelect,
  Marker,
  Popup,
  Badge 
}: {
  flight: FlightState
  icon: any
  onFlightSelect?: (flight: FlightState) => void
  Marker: any
  Popup: any
  Badge: any
}) => {
  // Format functions
  const formatAltitude = (altitude: number | null): string => {
    if (altitude === null) return 'Unknown'
    return `${Math.round(altitude * 3.28084).toLocaleString()} ft`
  }

  const formatSpeed = (velocity: number | null): string => {
    if (velocity === null) return 'Unknown'
    return `${Math.round(velocity * 1.94384)} kts`
  }

  const getTimeSinceContact = (lastContact: number): string => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - lastContact
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }
  
  if (flight.latitude === null || flight.longitude === null) return null
  
  return (
    <Marker
      position={[flight.latitude, flight.longitude]}
      icon={icon}
      eventHandlers={{
        click: () => onFlightSelect?.(flight)
      }}
      riseOnHover={false}
      autoPanOnFocus={false}
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
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.flight.icao24 === nextProps.flight.icao24 &&
    prevProps.flight.latitude === nextProps.flight.latitude &&
    prevProps.flight.longitude === nextProps.flight.longitude &&
    prevProps.flight.true_track === nextProps.flight.true_track &&
    prevProps.flight.last_contact === nextProps.flight.last_contact &&
    prevProps.icon === nextProps.icon
  )
})

// Optimized flight icon cache
const ICON_CACHE = new Map<string, any>()
const MAX_ICON_CACHE_SIZE = 720 // 360 degrees * 2 (selected/unselected)


// Flight icon rotation based on heading
function createRotatedFlightIcon(L: any, heading: number, isSelected: boolean = false): any {
  try {
    // Simple circle icon for testing
    const color = isSelected ? '#ef4444' : '#3b82f6' // red for selected, blue for normal
    const size = isSelected ? 16 : 12
    
    // Use divIcon instead of Icon for better compatibility
    const icon = L.divIcon({
      html: `<div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        transform: rotate(${heading}deg);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 3px solid transparent;
          border-right: 3px solid transparent;
          border-bottom: 6px solid ${color};
        "></div>
      </div>`,
      className: 'flight-marker-icon',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    })
    
    return icon
  } catch (error) {
    console.error('Error creating flight icon:', error)
    return null
  }
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
  maxFlightsDisplayed = 500,
  onMapMove,
  flights: propFlights,
  onDisplayedFlightsChange,
}: FlightMapClientProps) {
  const { resolvedTheme } = useTheme()
  const flightData = useFlightData()
  const [mapBounds, setMapBounds] = useState<FlightBounds | null>(null)
  const [displayedFlights, setDisplayedFlights] = useState<FlightState[]>(() => {
    const initial = propFlights || []
    console.log('FlightMapClient - Initial flights:', initial.length)
    return initial
  })
  const updateTimeoutRef = useRef<NodeJS.Timeout>()
  const lastReportedCountRef = useRef<number>(0)

  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } = MapComponents
  const L = MapComponents.L

  // Memoized bounds change handler
  const handleBoundsChange = useCallback((newBounds: FlightBounds, zoom: number) => {
    setMapBounds(newBounds)
    onMapMove?.(newBounds, zoom)
  }, [onMapMove])

  // Map event handler component
  const MapEventHandler = memo(() => {
    const map = useMap()
    const hasMountedRef = useRef(false)
    
    useMapEvents({
      moveend: () => {
        const bounds = map.getBounds()
        const newBounds: FlightBounds = {
          lamin: bounds.getSouth(),
          lamax: bounds.getNorth(),
          lomin: bounds.getWest(),
          lomax: bounds.getEast(),
        }
        handleBoundsChange(newBounds, map.getZoom())
      },
      zoomend: () => {
        const bounds = map.getBounds()
        const newBounds: FlightBounds = {
          lamin: bounds.getSouth(),
          lamax: bounds.getNorth(),
          lomin: bounds.getWest(),
          lomax: bounds.getEast(),
        }
        handleBoundsChange(newBounds, map.getZoom())
      }
    })
    
    // Set initial bounds after mount
    useEffect(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true
        // Delay to ensure map is ready
        const timer = setTimeout(() => {
          try {
            const bounds = map.getBounds()
            const initialBounds: FlightBounds = {
              lamin: bounds.getSouth(),
              lamax: bounds.getNorth(),
              lomin: bounds.getWest(),
              lomax: bounds.getEast(),
            }
            console.log('Initial map bounds:', initialBounds)
            handleBoundsChange(initialBounds, map.getZoom())
          } catch (error) {
            console.warn('Failed to get initial bounds:', error)
          }
        }, 100)
        
        return () => clearTimeout(timer)
      }
    }, [])
    
    return null
  })

  // Fetch flight track when a flight is selected
  const { data: trackData } = useFlightTrack(
    selectedFlight?.icao24 || '',
    {
      enabled: !!selectedFlight?.icao24,
      staleTime: 300000, // 5 minutes
    }
  )

  // Update displayed flights when data changes or bounds change
  useEffect(() => {
    console.log('FlightMapView useEffect - propFlights:', propFlights?.length)
    
    const updateFlights = () => {
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      
      // Debounce updates to prevent excessive re-renders
      updateTimeoutRef.current = setTimeout(() => {
        let flights: FlightState[]
        
        // Use prop flights if provided, otherwise query from local store
        if (propFlights && propFlights.length > 0) {
          flights = propFlights
          console.log('Using prop flights:', flights.length)
          
          // Apply bounds filtering to prop flights
          if (mapBounds) {
            flights = flights.filter(f => {
              if (!f.latitude || !f.longitude) return false
              return f.latitude >= mapBounds.lamin && 
                     f.latitude <= mapBounds.lamax &&
                     f.longitude >= mapBounds.lomin && 
                     f.longitude <= mapBounds.lomax
            })
            console.log('After bounds filtering:', flights.length, 'flights in view')
          }
        } else {
          // Fallback to local store query
          if (showOnlyBounds && bounds) {
            flights = flightData.queryFlights({ bounds })
          } else if (mapBounds) {
            flights = flightData.queryFlights({ bounds: mapBounds })
            console.log('Querying flights with bounds:', mapBounds, 'Found:', flights.length)
          } else {
            flights = flightData.queryFlights()
            console.log('Querying all flights, found:', flights.length)
          }
        }
        
        // Filter out flights without valid coordinates
        const beforeFilter = flights.length
        flights = flights.filter(f => f.latitude !== null && f.longitude !== null)
        if (beforeFilter !== flights.length) {
          console.log('Filtered out', beforeFilter - flights.length, 'flights without coordinates')
        }
        
        // Limit number of displayed flights for performance
        if (flights.length > maxFlightsDisplayed) {
          console.log(`Limiting flights from ${flights.length} to ${maxFlightsDisplayed}`)
          // Sort by last update time and take the most recent
          flights = flights
            .sort((a, b) => (b.last_contact || 0) - (a.last_contact || 0))
            .slice(0, maxFlightsDisplayed)
        }
        
        // Only update if flights have actually changed
        setDisplayedFlights(prevFlights => {
          // Quick check if the arrays are different
          if (prevFlights.length !== flights.length) {
            console.log('Updating displayed flights from', prevFlights.length, 'to', flights.length)
            return flights
          }
          
          // Check if any flight has changed position
          const hasChanges = flights.some((flight, index) => {
            const prevFlight = prevFlights[index]
            return !prevFlight || 
                   prevFlight.icao24 !== flight.icao24 ||
                   prevFlight.latitude !== flight.latitude ||
                   prevFlight.longitude !== flight.longitude ||
                   prevFlight.true_track !== flight.true_track
          })
          
          if (hasChanges) {
            console.log('Flight positions changed, updating display')
          }
          
          return hasChanges ? flights : prevFlights
        })
        
        // Notify parent about displayed flights count only if it changed
        if (onDisplayedFlightsChange && flights.length !== lastReportedCountRef.current) {
          lastReportedCountRef.current = flights.length
          // Use setTimeout to avoid update depth issues
          setTimeout(() => {
            onDisplayedFlightsChange(flights.length)
          }, 0)
        }
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
  }, [flightData, bounds, showOnlyBounds, mapBounds, maxFlightsDisplayed, propFlights])


  // Memoized icon getter function
  const getFlightIcon = useCallback((heading: number, isSelected: boolean) => {
    if (!L) return null
    try {
      return createRotatedFlightIcon(L, heading, isSelected)
    } catch (error) {
      console.warn('Failed to create flight icon:', error)
      return null
    }
  }, [L])

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        preferCanvas={false} // Try without canvas renderer
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
        
        {/* Flight path for selected flight */}
        {selectedFlight && trackData?.track && (
          <FlightPath
            track={trackData.track}
            Polyline={Polyline}
            isSelected={true}
            maxPoints={500}
            showAltitudeGradient={true}
          />
        )}
        
        {/* Flight markers with optimized rendering */}
        {console.log('Rendering', displayedFlights.length, 'flight markers')}
        {displayedFlights.map((flight, index) => {
          const heading = flight.true_track || 0
          const isSelected = selectedFlight?.icao24 === flight.icao24
          const icon = getFlightIcon(heading, isSelected)
          
          if (!icon) {
            console.warn('No icon for flight:', flight.icao24)
            return null
          }
          
          // Debug: Log first few flights
          if (index < 3) {
            console.log('Rendering flight:', flight.icao24, 'at', flight.latitude, flight.longitude, 'icon:', icon)
          }
          
          return (
            <FlightMarker
              key={flight.icao24}
              flight={flight}
              icon={icon}
              onFlightSelect={onFlightSelect}
              Marker={Marker}
              Popup={Popup}
              Badge={Badge}
            />
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
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { MapPin, Navigation2, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common'
import { useMapState, usePreferences } from '@/contexts/AppContext'
import type { Airport } from '@/types'
import 'leaflet/dist/leaflet.css'

interface MapViewProps {
  airports?: Airport[]
  selectedAirport?: Airport | null
  onAirportSelect?: (airport: Airport) => void
  center?: [number, number]
  zoom?: number
  height?: string
  showControls?: boolean
  useGlobalState?: boolean // New prop to enable/disable state integration
  onMapClick?: (lat: number, lng: number) => void // New prop for map click handler
  allowMarkerDrag?: boolean // New prop to enable marker dragging
  onMarkerDragEnd?: (airport: Airport, newLat: number, newLng: number) => void // New prop for marker drag end
}

// Client-only wrapper component
function MapClient({
  airports = [],
  selectedAirport,
  onAirportSelect,
  center = [39.8283, -98.5795],
  zoom = 4,
  height = '500px',
  showControls = true,
  useGlobalState = false,
  mapState,
  updateMapCenter,
  updateMapZoom,
  setGlobalSelectedAirport,
  updateMapState,
  preferences,
  onMapClick,
  allowMarkerDrag = false,
  onMarkerDragEnd,
}: MapViewProps & {
  mapState: any
  updateMapCenter: any
  updateMapZoom: any
  setGlobalSelectedAirport: any
  updateMapState: any
  preferences: any
}) {
  const [MapComponents, setMapComponents] = useState<any>(null)
  
  // Determine which values to use based on useGlobalState prop
  const effectiveCenter = useGlobalState ? mapState.center : center
  const effectiveZoom = useGlobalState ? mapState.zoom : zoom
  const effectiveSelectedAirport = useGlobalState ? mapState.selectedAirport : selectedAirport
  
  // Handle airport selection - must be defined before any conditional returns
  const handleAirportSelect = useCallback((airport: Airport) => {
    if (useGlobalState) {
      setGlobalSelectedAirport(airport)
      // Update map center to the selected airport
      updateMapState({
        center: [airport.latitude, airport.longitude],
        zoom: 13,
        selectedAirport: airport
      })
    }
    // Also call the optional callback
    onAirportSelect?.(airport)
  }, [useGlobalState, setGlobalSelectedAirport, updateMapState, onAirportSelect])
  
  // Create custom icon for selected airport - must be called unconditionally
  const selectedIcon = useMemo(() => {
    if (!MapComponents?.L?.Icon) return null
    try {
      return new MapComponents.L.Icon({
        iconUrl: '/leaflet/marker-icon-red.png',
        shadowUrl: '/leaflet/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      })
    } catch (error) {
      console.error('Failed to create custom icon:', error)
      return null
    }
  }, [MapComponents?.L])

  useEffect(() => {
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

  if (!MapComponents) {
    return (
      <Card className="overflow-hidden">
        <div className="relative flex items-center justify-center" style={{ height }}>
          <LoadingSpinner text="Loading map..." />
        </div>
      </Card>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } = MapComponents
  const L = MapComponents.L

  // Component to handle map events when using global state
  function MapEventHandler() {
    const map = useMap()
    
    useEffect(() => {
      if (useGlobalState) {
        const handleMoveEnd = () => {
          const newCenter = map.getCenter()
          const newZoom = map.getZoom()
          updateMapCenter([newCenter.lat, newCenter.lng])
          updateMapZoom(newZoom)
        }
        
        map.on('moveend', handleMoveEnd)
        map.on('zoomend', handleMoveEnd)
        
        return () => {
          map.off('moveend', handleMoveEnd)
          map.off('zoomend', handleMoveEnd)
        }
      }
    }, [map])
    
    return null
  }

  // Component to handle map click events
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng)
        }
      },
    })
    return null
  }

  // Custom zoom controls component
  function ZoomControls() {
    const map = useMap()
    
    return (
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-1">
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={() => map.zoomIn()}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={() => map.zoomOut()}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-8 w-8"
          onClick={() => {
            map.locate({ setView: true, maxZoom: 10 })
          }}
          aria-label="Go to my location"
        >
          <Navigation2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // Update center if an airport is selected
  const mapCenter: [number, number] = effectiveSelectedAirport 
    ? [effectiveSelectedAirport.latitude, effectiveSelectedAirport.longitude]
    : effectiveCenter
    
  const mapZoom = effectiveSelectedAirport ? 13 : effectiveZoom

  return (
    <div className="relative overflow-hidden rounded-lg border bg-card" style={{ height }}>
      <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {useGlobalState && <MapEventHandler />}
          
          {onMapClick && <MapClickHandler />}
          
          {showControls && <ZoomControls />}
          
          {airports.map((airport) => {
            const isSelected = effectiveSelectedAirport?.iata === airport.iata
            const markerKey = `marker-${airport.iata}-${airport.icao}-${isSelected ? 'selected' : 'default'}`
            const markerProps: any = {
              position: [airport.latitude, airport.longitude],
              draggable: allowMarkerDrag,
              eventHandlers: {
                click: () => {
                  handleAirportSelect(airport)
                },
                dragend: (e: any) => {
                  if (onMarkerDragEnd && allowMarkerDrag) {
                    const marker = e.target
                    const position = marker.getLatLng()
                    onMarkerDragEnd(airport, position.lat, position.lng)
                  }
                },
              }
            }
            
            // Only add custom icon if it's properly loaded and airport is selected
            if (isSelected && selectedIcon) {
              markerProps.icon = selectedIcon
            }
            
            return (
              <Marker key={markerKey} {...markerProps}>
                <Popup>
                  <div className="p-2 min-w-[200px] max-w-[300px]">
                    <h3 className="font-semibold text-sm mb-1">{airport.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {airport.city}, {airport.region}, {airport.country}
                    </p>
                    <div className="flex gap-2 text-xs mb-2">
                      <Badge variant="outline" className="px-1.5 py-0">{airport.iata}</Badge>
                      <Badge variant="outline" className="px-1.5 py-0">{airport.icao}</Badge>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">Elevation:</span>
                        <span>{airport.elevation_ft.toLocaleString()} ft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Coordinates:</span>
                        <span>{airport.latitude.toFixed(4)}, {airport.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Timezone:</span>
                        <span>{airport.timezone}</span>
                      </div>
                    </div>
                    {allowMarkerDrag && (
                      <div className="mt-3 pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                          <Move className="inline h-3 w-3 mr-1" />
                          Drag marker to reposition
                        </p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
        
        {/* Legend */}
        {airports.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-md p-3 shadow-lg z-[1000]">
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{airports.length} airport{airports.length !== 1 ? 's' : ''} displayed</span>
            </div>
          </div>
        )}
      </div>
  )
}

// Export a component that only renders on client
export function MapView(props: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  
  // Always call hooks at the top level
  const { mapState, updateMapCenter, updateMapZoom, setSelectedAirport: setGlobalSelectedAirport, updateMapState } = useMapState()
  const { preferences } = usePreferences()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return (
      <Card className="overflow-hidden">
        <div className="relative flex items-center justify-center" style={{ height: props.height || '500px' }}>
          <LoadingSpinner text="Loading map..." />
        </div>
      </Card>
    )
  }
  
  return (
    <MapClient 
      {...props} 
      mapState={mapState}
      updateMapCenter={updateMapCenter}
      updateMapZoom={updateMapZoom}
      setGlobalSelectedAirport={setGlobalSelectedAirport}
      updateMapState={updateMapState}
      preferences={preferences}
    />
  )
}
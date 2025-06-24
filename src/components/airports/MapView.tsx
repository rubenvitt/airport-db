import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { MapPin, Navigation2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common'
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
}

export function MapView({
  airports = [],
  selectedAirport,
  onAirportSelect,
  center = [39.8283, -98.5795], // Center of USA
  zoom = 4,
  height = '500px',
  showControls = true,
}: MapViewProps) {
  const [isClient, setIsClient] = useState(false)
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Dynamically import Leaflet and React-Leaflet only on client side
    const loadMapComponents = async () => {
      const L = await import('leaflet')
      const ReactLeaflet = await import('react-leaflet')
      
      // Fix Leaflet's default icon paths
      delete (L.default.Icon.Default.prototype as any)._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: '/leaflet/marker-icon-2x.png',
        iconUrl: '/leaflet/marker-icon.png',
        shadowUrl: '/leaflet/marker-shadow.png',
      })
      
      setMapComponents({ L: L.default, ...ReactLeaflet })
    }
    
    if (typeof window !== 'undefined') {
      loadMapComponents()
    }
  }, [])

  if (!isClient || !MapComponents) {
    return (
      <Card className="overflow-hidden">
        <div className="relative flex items-center justify-center" style={{ height }}>
          <LoadingSpinner text="Loading map..." />
        </div>
      </Card>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = MapComponents
  const L = MapComponents.L

  // Component to handle map updates when props change
  function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap()
    
    useEffect(() => {
      map.setView(center, zoom, {
        animate: true,
        duration: 1
      })
    }, [center, zoom, map])
    
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
  const mapCenter: [number, number] = selectedAirport 
    ? [selectedAirport.latitude, selectedAirport.longitude]
    : center
    
  const mapZoom = selectedAirport ? 13 : zoom

  // Create custom icon for selected airport
  const selectedIcon = new L.Icon({
    iconUrl: '/leaflet/marker-icon-red.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height }}>
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
          
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          
          {showControls && <ZoomControls />}
          
          {airports.map((airport) => {
            const isSelected = selectedAirport?.iata === airport.iata
            
            return (
              <Marker
                key={`${airport.iata}-${airport.icao}`}
                position={[airport.latitude, airport.longitude]}
                icon={isSelected ? selectedIcon : undefined}
                eventHandlers={{
                  click: () => {
                    onAirportSelect?.(airport)
                  },
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-sm mb-1">{airport.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {airport.city}, {airport.region}, {airport.country}
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="font-medium">IATA:</span> {airport.iata}
                      <span className="font-medium ml-2">ICAO:</span> {airport.icao}
                    </div>
                    <div className="text-xs mt-1">
                      <span className="font-medium">Elevation:</span> {airport.elevation_ft.toLocaleString()} ft
                    </div>
                    <div className="text-xs mt-1">
                      <span className="font-medium">Timezone:</span> {airport.timezone}
                    </div>
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
    </Card>
  )
}
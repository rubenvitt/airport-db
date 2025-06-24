import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Card } from '@/components/ui/card'
import { MapPin, Navigation2, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Airport } from '@/types'

// Fix Leaflet's default icon paths
import 'leaflet/dist/leaflet.css'
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface MapViewProps {
  airports?: Airport[]
  selectedAirport?: Airport | null
  onAirportSelect?: (airport: Airport) => void
  center?: [number, number]
  zoom?: number
  height?: string
  showControls?: boolean
}

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

export function MapView({
  airports = [],
  selectedAirport,
  onAirportSelect,
  center = [39.8283, -98.5795], // Center of USA
  zoom = 4,
  height = '500px',
  showControls = true,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null)
  
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
          ref={mapRef}
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
                icon={isSelected ? selectedIcon : new L.Icon.Default()}
                eventHandlers={{
                  click: () => onAirportSelect?.(airport),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-semibold text-lg">{airport.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {airport.city}, {airport.region}, {airport.country}
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IATA:</span>
                        <span className="font-medium">{airport.iata}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ICAO:</span>
                        <span className="font-medium">{airport.icao}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Elevation:</span>
                        <span className="font-medium">{airport.elevation_ft.toLocaleString()} ft</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
        
        {airports.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[999]">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Search for airports to display them on the map</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
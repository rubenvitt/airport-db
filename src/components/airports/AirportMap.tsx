import React, { useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { Icon, LatLngBounds } from 'leaflet'
import { MapPin, Minus, Navigation2, Plus, Star } from 'lucide-react'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Airport } from '@/types/airport'
import { useAirportExplorer } from '@/contexts/AirportExplorerContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React Leaflet

delete (Icon.Default.prototype as any)._getIconUrl
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

// Custom marker icons
const createCustomIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 38 : 32
  const iconHtml = `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background-color: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid ${isSelected ? '#1e40af' : '#fff'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: ${isSelected ? '16px' : '14px'};
      ">✈</div>
    </div>
  `
  
  return new Icon({
    html: iconHtml,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    className: 'custom-marker-icon',
  })
}

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
}

const MapControls: React.FC<MapControlsProps> = ({ onZoomIn, onZoomOut, onResetView }) => {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        onClick={onZoomIn}
        className="bg-white shadow-md hover:bg-gray-100"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={onZoomOut}
        className="bg-white shadow-md hover:bg-gray-100"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={onResetView}
        className="bg-white shadow-md hover:bg-gray-100"
      >
        <Navigation2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface MapUpdaterProps {
  center: [number, number]
  zoom: number
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ center, zoom }) => {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  
  return null
}

interface AirportMapProps {
  className?: string
  height?: string
}

export const AirportMap: React.FC<AirportMapProps> = ({ 
  className = '', 
  height = '500px' 
}) => {
  const mapRef = useRef<any>(null)
  const {
    mapCenter,
    mapZoom,
    markers,
    setMapCenter,
    setMapZoom,
    selectMarker,
    savedAirports,
    saveAirport,
    unsaveAirport,
    isSavedAirport,
    comparisonAirports,
    isComparisonMode,
    addToComparison,
    removeFromComparison,
    isInComparison,
  } = useAirportExplorer()
  
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn()
    }
  }
  
  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut()
    }
  }
  
  const handleResetView = () => {
    setMapCenter([0, 0])
    setMapZoom(2)
  }
  
  const handleMarkerClick = (airport: Airport) => {
    selectMarker(airport.iata)
    setMapCenter([airport.latitude, airport.longitude])
    setMapZoom(12)
  }
  
  const getMarkerIcon = (marker: AirportMarker) => {
    const isSaved = isSavedAirport(marker.airport.iata)
    const inComparison = isInComparison(marker.airport.iata)
    
    let color = '#3b82f6' // Default blue
    if (inComparison) color = '#10b981' // Green for comparison
    else if (isSaved) color = '#f59e0b' // Amber for saved
    
    return createCustomIcon(color, marker.isSelected)
  }
  
  // Auto-fit bounds when markers change
  useEffect(() => {
    if (markers.length > 0 && mapRef.current) {
      const bounds = new LatLngBounds(
        markers.map(m => [m.airport.latitude, m.airport.longitude])
      )
      mapRef.current.fitBounds(bounds, { padding: [50, 50] })
    }
  }, [markers])
  
  return (
    <Card className={className}>
      <CardContent className="p-0 relative">
        <div style={{ height, position: 'relative' }}>
          <MapContainer
            ref={mapRef}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            {markers.map((marker) => (
              <Marker
                key={marker.airport.iata}
                position={[marker.airport.latitude, marker.airport.longitude]}
                icon={getMarkerIcon(marker)}
                eventHandlers={{
                  click: () => handleMarkerClick(marker.airport),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[250px]">
                    <h3 className="font-semibold text-lg mb-2">{marker.airport.name}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {marker.airport.city}, {marker.airport.country}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge>{marker.airport.iata}</Badge>
                        <Badge variant="secondary">{marker.airport.icao}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Elevation: {marker.airport.elevation_ft.toLocaleString()} ft
                      </p>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant={isSavedAirport(marker.airport.iata) ? "default" : "outline"}
                        onClick={() => {
                          if (isSavedAirport(marker.airport.iata)) {
                            unsaveAirport(marker.airport.iata)
                          } else {
                            saveAirport(marker.airport)
                          }
                        }}
                        className="flex-1"
                      >
                        <Star className={`h-3 w-3 mr-1 ${isSavedAirport(marker.airport.iata) ? 'fill-current' : ''}`} />
                        {isSavedAirport(marker.airport.iata) ? 'Saved' : 'Save'}
                      </Button>
                      
                      {isComparisonMode && (
                        <Button
                          size="sm"
                          variant={isInComparison(marker.airport.iata) ? "default" : "outline"}
                          onClick={() => {
                            if (isInComparison(marker.airport.iata)) {
                              removeFromComparison(marker.airport.iata)
                            } else {
                              addToComparison(marker.airport)
                            }
                          }}
                          className="flex-1"
                          disabled={!isInComparison(marker.airport.iata) && comparisonAirports.length >= 4}
                        >
                          {isInComparison(marker.airport.iata) ? 'Remove' : 'Compare'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          
          <MapControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface AirportMarker {
  airport: Airport
  isSelected: boolean
}
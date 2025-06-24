import React from 'react'
import { 
  CheckSquare, 
  Eye, 
  EyeOff, 
  Globe, 
  MapPin, 
  Navigation,
  Square,
  Star,
  Trash2
} from 'lucide-react'
import type { Airport } from '@/types/airport'
import { useAirportExplorer } from '@/contexts/AirportExplorerContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common'

interface AirportListProps {
  airports?: Array<Airport>
  title?: string
  description?: string
  showSaveButton?: boolean
  showCompareButton?: boolean
  showRemoveButton?: boolean
  onAirportClick?: (airport: Airport) => void
  className?: string
}

export const AirportList: React.FC<AirportListProps> = ({
  airports: propAirports,
  title = 'Saved Airports',
  description = 'Your favorite airports for quick access',
  showSaveButton = true,
  showCompareButton = true,
  showRemoveButton = false,
  onAirportClick,
  className = '',
}) => {
  const {
    savedAirports,
    markers,
    addMarker,
    removeMarker,
    selectMarker,
    saveAirport,
    unsaveAirport,
    isSavedAirport,
    isComparisonMode,
    comparisonAirports,
    addToComparison,
    removeFromComparison,
    isInComparison,
    setMapCenter,
    setMapZoom,
  } = useAirportExplorer()
  
  const airports = propAirports || savedAirports
  
  const isAirportOnMap = (iataCode: string) => {
    return markers.some(m => m.airport.iata === iataCode)
  }
  
  const handleToggleOnMap = (airport: Airport) => {
    if (isAirportOnMap(airport.iata)) {
      removeMarker(airport.iata)
    } else {
      addMarker(airport)
    }
  }
  
  const handleViewOnMap = (airport: Airport) => {
    if (!isAirportOnMap(airport.iata)) {
      addMarker(airport)
    }
    selectMarker(airport.iata)
    setMapCenter([airport.latitude, airport.longitude])
    setMapZoom(12)
  }
  
  const handleAirportClick = (airport: Airport) => {
    if (onAirportClick) {
      onAirportClick(airport)
    } else {
      handleViewOnMap(airport)
    }
  }
  
  if (airports.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No airports yet"
            message="Search for airports and save your favorites here"
            icon={Star}
          />
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="secondary">{airports.length} airports</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {airports.map((airport) => (
            <div
              key={airport.iata}
              className="group relative rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between">
                <button
                  onClick={() => handleAirportClick(airport)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium">{airport.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {airport.city}, {airport.country}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {airport.iata}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {airport.icao}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {airport.elevation_ft.toLocaleString()} ft
                    </span>
                  </div>
                </button>
                
                <div className="flex items-center gap-1 ml-4">
                  {/* Toggle on map button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleToggleOnMap(airport)}
                    className="h-8 w-8"
                    title={isAirportOnMap(airport.iata) ? 'Remove from map' : 'Show on map'}
                  >
                    {isAirportOnMap(airport.iata) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {/* View on map button */}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleViewOnMap(airport)}
                    className="h-8 w-8"
                    title="View on map"
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                  
                  {/* Save/Unsave button */}
                  {showSaveButton && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (isSavedAirport(airport.iata)) {
                          unsaveAirport(airport.iata)
                        } else {
                          saveAirport(airport)
                        }
                      }}
                      className="h-8 w-8"
                      title={isSavedAirport(airport.iata) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`h-4 w-4 ${isSavedAirport(airport.iata) ? 'fill-current text-yellow-500' : ''}`} />
                    </Button>
                  )}
                  
                  {/* Compare button */}
                  {showCompareButton && isComparisonMode && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (isInComparison(airport.iata)) {
                          removeFromComparison(airport.iata)
                        } else {
                          addToComparison(airport)
                        }
                      }}
                      className="h-8 w-8"
                      disabled={!isInComparison(airport.iata) && comparisonAirports.length >= 4}
                      title={isInComparison(airport.iata) ? 'Remove from comparison' : 'Add to comparison'}
                    >
                      {isInComparison(airport.iata) ? (
                        <CheckSquare className="h-4 w-4 text-green-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* Remove button */}
                  {showRemoveButton && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => unsaveAirport(airport.iata)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* External link */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${airport.latitude},${airport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent"
                    title="View on Google Maps"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
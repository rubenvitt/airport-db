import React from 'react'
import { 
  Clock, 
  GitCompare, 
  Globe, 
  MapPin, 
  Mountain,
  Plane,
  Ruler,
  X
} from 'lucide-react'
import { useAirportExplorer } from '@/contexts/AirportExplorerContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Airport } from '@/types/airport'

interface ComparisonRowProps {
  label: string
  icon?: React.ReactNode
  values: Array<string | number>
  highlight?: 'min' | 'max'
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({ 
  label, 
  icon, 
  values, 
  highlight 
}) => {
  const numericValues = values.map(v => 
    typeof v === 'number' ? v : parseFloat(v.toString()) || 0
  )
  
  let highlightIndices: Array<number> = []
  if (highlight === 'min') {
    const min = Math.min(...numericValues)
    highlightIndices = numericValues
      .map((v, i) => v === min ? i : -1)
      .filter(i => i !== -1)
  } else if (highlight === 'max') {
    const max = Math.max(...numericValues)
    highlightIndices = numericValues
      .map((v, i) => v === max ? i : -1)
      .filter(i => i !== -1)
  }
  
  return (
    <div className="grid grid-cols-5 gap-4 py-3">
      <div className="flex items-center gap-2 font-medium">
        {icon}
        {label}
      </div>
      {values.map((value, index) => (
        <div
          key={index}
          className={`text-sm ${
            highlightIndices.includes(index) 
              ? 'font-semibold text-primary' 
              : 'text-muted-foreground'
          }`}
        >
          {value}
        </div>
      ))}
    </div>
  )
}

interface AirportComparisonProps {
  className?: string
}

export const AirportComparison: React.FC<AirportComparisonProps> = ({ 
  className = '' 
}) => {
  const {
    comparisonAirports,
    removeFromComparison,
    clearComparison,
    isComparisonMode,
  } = useAirportExplorer()
  
  if (!isComparisonMode || comparisonAirports.length === 0) {
    return null
  }
  
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return Math.round(R * c)
  }
  
  // Pad arrays to have 4 items for consistent grid
  const paddedAirports = [...comparisonAirports]
  while (paddedAirports.length < 4) {
    paddedAirports.push(null as any)
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            <CardTitle>Airport Comparison</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{comparisonAirports.length}/4 airports</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearComparison}
            >
              Clear All
            </Button>
          </div>
        </div>
        <CardDescription>
          Compare key metrics across selected airports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Header row with airports */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div></div>
          {paddedAirports.map((airport, index) => (
            <div key={index} className="space-y-2">
              {airport ? (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{airport.name}</h4>
                      <p className="text-xs text-muted-foreground">{airport.city}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-1"
                      onClick={() => removeFromComparison(airport.iata)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-xs">{airport.iata}</Badge>
                    <Badge variant="outline" className="text-xs">{airport.icao}</Badge>
                  </div>
                </>
              ) : (
                <div className="h-[74px] flex items-center justify-center border-2 border-dashed rounded-md">
                  <span className="text-xs text-muted-foreground">Empty slot</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        {/* Comparison rows */}
        <div className="space-y-1">
          <ComparisonRow
            label="Country"
            icon={<Globe className="h-4 w-4" />}
            values={paddedAirports.map(a => a?.country || '-')}
          />
          
          <ComparisonRow
            label="Region"
            icon={<MapPin className="h-4 w-4" />}
            values={paddedAirports.map(a => a?.region || '-')}
          />
          
          <ComparisonRow
            label="Elevation"
            icon={<Mountain className="h-4 w-4" />}
            values={paddedAirports.map(a => 
              a ? `${a.elevation_ft.toLocaleString()} ft` : '-'
            )}
            highlight="max"
          />
          
          <ComparisonRow
            label="Timezone"
            icon={<Clock className="h-4 w-4" />}
            values={paddedAirports.map(a => a?.timezone || '-')}
          />
          
          <ComparisonRow
            label="Latitude"
            icon={<Ruler className="h-4 w-4" />}
            values={paddedAirports.map(a => 
              a ? a.latitude.toFixed(4) : '-'
            )}
          />
          
          <ComparisonRow
            label="Longitude"
            icon={<Ruler className="h-4 w-4" />}
            values={paddedAirports.map(a => 
              a ? a.longitude.toFixed(4) : '-'
            )}
          />
        </div>
        
        {/* Distance matrix */}
        {comparisonAirports.length >= 2 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Plane className="h-4 w-4" />
                Distance Matrix (km)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2"></th>
                      {comparisonAirports.map(airport => (
                        <th key={airport.iata} className="text-left p-2">
                          {airport.iata}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonAirports.map((airport1, i) => (
                      <tr key={airport1.iata}>
                        <td className="font-medium p-2">{airport1.iata}</td>
                        {comparisonAirports.map((airport2, j) => (
                          <td key={airport2.iata} className="p-2">
                            {i === j ? '-' : calculateDistance(
                              airport1.latitude,
                              airport1.longitude,
                              airport2.latitude,
                              airport2.longitude
                            ).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
import React from 'react'
import { X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useComparison } from '@/contexts/ComparisonContext'
import type { Airport } from '@/types/airport'

interface ComparisonPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComparisonPanel({ open, onOpenChange }: ComparisonPanelProps) {
  const { comparedAirports, removeFromComparison, clearComparison } = useComparison()

  const formatElevation = (elevation: number) => {
    return `${elevation.toLocaleString()} ft (${Math.round(elevation * 0.3048)} m)`
  }

  const formatCoordinates = (lat: number, lon: number) => {
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`
  }

  const properties = [
    { key: 'iata', label: 'IATA Code' },
    { key: 'icao', label: 'ICAO Code' },
    { key: 'name', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'region', label: 'Region' },
    { key: 'country', label: 'Country' },
    { key: 'elevation_ft', label: 'Elevation', format: (val: any) => formatElevation(val) },
    { key: 'coordinates', label: 'Coordinates', getValue: (airport: Airport) => formatCoordinates(airport.latitude, airport.longitude) },
    { key: 'timezone', label: 'Timezone' },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Compare Airports</SheetTitle>
          <SheetDescription>
            Compare up to 3 airports side by side. Click the X button to remove an airport from comparison.
          </SheetDescription>
        </SheetHeader>

        {comparedAirports.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            No airports selected for comparison
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)] mt-6">
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comparedAirports.map((airport) => (
                  <div key={airport.icao} className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => removeFromComparison(airport.icao)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="font-semibold text-lg truncate">
                        {airport.name}
                      </div>
                      <Separator />
                      {properties.map((prop) => (
                        <div key={prop.key} className="space-y-1">
                          <div className="text-sm text-muted-foreground">{prop.label}</div>
                          <div className="font-medium">
                            {prop.getValue
                              ? prop.getValue(airport)
                              : prop.format
                              ? prop.format(airport[prop.key as keyof Airport])
                              : airport[prop.key as keyof Airport]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}

        {comparedAirports.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={clearComparison}>
              Clear All
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
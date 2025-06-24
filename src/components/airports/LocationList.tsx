import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { 
  MapPin, 
  Navigation, 
  Search, 
  ChevronRight,
  Plane,
  Globe,
  Heart,
  HeartOff,
  Filter,
  X
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Airport } from '@/types'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LocationListProps {
  airports: Airport[]
  selectedAirport?: Airport | null
  onAirportSelect?: (airport: Airport) => void
  onAirportRemove?: (airport: Airport) => void
  title?: string
  showActions?: boolean
  height?: string
  className?: string
  emptyMessage?: string
  favoriteAirports?: string[]
  onToggleFavorite?: (airport: Airport) => void
}

type SortOption = 'name' | 'city' | 'country' | 'iata' | 'elevation'

export function LocationList({
  airports,
  selectedAirport,
  onAirportSelect,
  onAirportRemove,
  title = "Locations",
  showActions = true,
  height = "600px",
  className,
  emptyMessage = "No airports to display",
  favoriteAirports = [],
  onToggleFavorite,
}: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [filterCountry, setFilterCountry] = useState<string>('all')

  // Get unique countries for filter
  const countries = Array.from(new Set(airports.map(a => a.country))).sort()

  // Filter and sort airports
  const filteredAirports = airports
    .filter(airport => {
      const matchesSearch = searchQuery.toLowerCase() === '' || 
        airport.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        airport.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        airport.iata.toLowerCase().includes(searchQuery.toLowerCase()) ||
        airport.icao.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCountry = filterCountry === 'all' || airport.country === filterCountry
      
      return matchesSearch && matchesCountry
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'city':
          return a.city.localeCompare(b.city)
        case 'country':
          return a.country.localeCompare(b.country)
        case 'iata':
          return a.iata.localeCompare(b.iata)
        case 'elevation':
          return b.elevation_ft - a.elevation_ft
        default:
          return 0
      }
    })

  const isFavorite = (airport: Airport) => favoriteAirports.includes(airport.iata)

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
          <Badge variant="secondary">{filteredAirports.length} airports</Badge>
        </div>
        
        {/* Search and Filters */}
        <div className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search airports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="iata">IATA Code</SelectItem>
                <SelectItem value="elevation">Elevation</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(country => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea style={{ height }}>
          {filteredAirports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8">
              <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-center px-4">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-1 p-4">
              {filteredAirports.map((airport) => {
                const isSelected = selectedAirport?.iata === airport.iata
                const favorite = isFavorite(airport)
                
                return (
                  <div
                    key={`${airport.iata}-${airport.icao}`}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer",
                      "hover:bg-accent hover:border-accent-foreground/20",
                      isSelected && "bg-primary/10 border-primary"
                    )}
                    onClick={() => onAirportSelect?.(airport)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold line-clamp-1">{airport.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {airport.city}, {airport.region}, {airport.country}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Badge variant="outline" className="text-xs">{airport.iata}</Badge>
                        <Badge variant="secondary" className="text-xs">{airport.icao}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Elevation: {airport.elevation_ft.toLocaleString()} ft</span>
                      <span>{airport.timezone}</span>
                    </div>
                    
                    {showActions && (
                      <div className="flex items-center gap-1 mt-2">
                        <Link to="/airports/$iataCode" params={{ iataCode: airport.iata }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </Link>
                        
                        <Link
                          to="/flights"
                          search={{ airport: airport.iata }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plane className="h-3 w-3 mr-1" />
                            Flights
                          </Button>
                        </Link>
                        
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${airport.latitude},${airport.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                          >
                            <Globe className="h-3 w-3 mr-1" />
                            Maps
                          </Button>
                        </a>
                        
                        {onToggleFavorite && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs ml-auto"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFavorite(airport)
                            }}
                          >
                            {favorite ? (
                              <Heart className="h-3 w-3 fill-current text-red-500" />
                            ) : (
                              <HeartOff className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        
                        {onAirportRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAirportRemove(airport)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
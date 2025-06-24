import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { 
  BarChart3, 
  Check, 
  ChevronRight, 
  Clock,
  Filter,
  Globe,
  Heart,
  HeartOff,
  MapPin,
  Navigation,
  Plane,
  Search,
  Star,
  X
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { LocationListSkeleton } from './LocationListSkeleton'
import type { Airport } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useComparison } from '@/contexts/ComparisonContext'
import { 
  useFavorites, 
  useMapState, 
  usePreferences, 
  useSearchHistory 
} from '@/contexts/AppContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EVENTS, emitAirportSelected, useEventBus } from '@/lib/eventBus'

interface LocationListProps {
  airports?: Array<Airport>
  selectedAirport?: Airport | null
  onAirportSelect?: (airport: Airport) => void
  onAirportRemove?: (airport: Airport) => void
  title?: string
  showActions?: boolean
  height?: string
  className?: string
  emptyMessage?: string
  favoriteAirports?: Array<string>
  onToggleFavorite?: (airport: Airport) => void
  useGlobalState?: boolean // New prop to enable global state integration
  showTabs?: boolean // Show tabs for switching between search results, favorites, and recent
  isLoading?: boolean // Show loading skeleton
}

type SortOption = 'name' | 'city' | 'country' | 'iata' | 'elevation'
type ViewMode = 'search' | 'favorites' | 'recent'

function LocationListComponent({
  airports: propAirports,
  selectedAirport: propSelectedAirport,
  onAirportSelect: propOnAirportSelect,
  onAirportRemove,
  title = "Locations",
  showActions = true,
  height = "600px",
  className,
  emptyMessage = "No airports to display",
  favoriteAirports: propFavoriteAirports,
  onToggleFavorite: propOnToggleFavorite,
  useGlobalState = false,
  showTabs = false,
  isLoading = false,
}: LocationListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [filterCountry, setFilterCountry] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('search')
  
  const { addToComparison, removeFromComparison, isInComparison, canAddMore } = useComparison()
  
  // Global state hooks
  const { 
    favoriteAirports: globalFavoriteAirports, 
    addFavoriteAirport, 
    removeFavoriteAirport,
    isFavoriteAirport 
  } = useFavorites()
  const { recentAirports, addRecentAirport } = useSearchHistory()
  const { mapState, setSelectedAirport: setGlobalSelectedAirport } = useMapState()
  const { preferences } = usePreferences()
  
  // Listen for search events to update view
  useEventBus(EVENTS.SEARCH_STARTED, () => {
    if (useGlobalState && showTabs) {
      setViewMode('search')
    }
  })
  
  useEventBus(EVENTS.SEARCH_CLEARED, () => {
    setSearchQuery('')
  })
  
  // Determine which state to use based on useGlobalState prop
  const selectedAirport = useGlobalState ? mapState.selectedAirport : propSelectedAirport
  const favoriteAirports = useGlobalState 
    ? globalFavoriteAirports.map(f => f.iata)
    : (propFavoriteAirports || [])
  
  // Determine which airports to show based on view mode
  let displayAirports: Array<Airport> = []
  if (useGlobalState && showTabs) {
    switch (viewMode) {
      case 'favorites':
        // Convert favorite airports to full Airport objects if we have them in the search results
        displayAirports = propAirports?.filter(a => favoriteAirports.includes(a.iata)) || []
        break
      case 'recent':
        displayAirports = recentAirports || []
        break
      default:
        displayAirports = propAirports || []
    }
  } else {
    displayAirports = propAirports || []
  }
  
  // Handle airport selection
  const handleAirportSelect = useCallback((airport: Airport) => {
    if (useGlobalState) {
      setGlobalSelectedAirport(airport)
      addRecentAirport(airport)
    }
    propOnAirportSelect?.(airport)
    emitAirportSelected(airport) // Emit event for other components
  }, [useGlobalState, setGlobalSelectedAirport, addRecentAirport, propOnAirportSelect])
  
  // Handle favorite toggle
  const handleToggleFavorite = useCallback((airport: Airport) => {
    if (useGlobalState) {
      if (isFavoriteAirport(airport.iata)) {
        removeFavoriteAirport(airport.iata)
      } else {
        addFavoriteAirport({
          iata: airport.iata,
          icao: airport.icao,
          name: airport.name,
          city: airport.city,
          country: airport.country,
        })
      }
    }
    propOnToggleFavorite?.(airport)
  }, [useGlobalState, isFavoriteAirport, removeFavoriteAirport, addFavoriteAirport, propOnToggleFavorite])
  
  // Persist sort and filter preferences in localStorage
  const STORAGE_KEY = 'locationListPreferences'
  
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const prefs = JSON.parse(saved)
      setSortBy(prefs.sortBy || 'name')
      setFilterCountry(prefs.filterCountry || 'all')
    }
  }, [])
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sortBy, filterCountry }))
  }, [sortBy, filterCountry])

  // Get unique countries for filter
  const countries = useMemo(() => 
    Array.from(new Set(displayAirports.map(a => a.country))).sort()
  , [displayAirports])

  // Filter and sort airports
  const filteredAirports = useMemo(() => {
    const searchLower = searchQuery.toLowerCase()
    
    return displayAirports
      .filter(airport => {
        const matchesSearch = searchLower === '' || 
          airport.name.toLowerCase().includes(searchLower) ||
          airport.city.toLowerCase().includes(searchLower) ||
          airport.iata.toLowerCase().includes(searchLower) ||
          airport.icao.toLowerCase().includes(searchLower)
        
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
  }, [displayAirports, searchQuery, filterCountry, sortBy])

  const isFavorite = (airport: Airport) => {
    if (useGlobalState) {
      return isFavoriteAirport(airport.iata)
    }
    return favoriteAirports.includes(airport.iata)
  }
  
  // Get count for each tab
  const favoriteCount = globalFavoriteAirports.length
  const recentCount = recentAirports.length
  
  // Determine empty message based on view mode
  const getEmptyMessage = () => {
    if (!useGlobalState || !showTabs) return emptyMessage
    
    switch (viewMode) {
      case 'favorites':
        return "No favorite airports yet. Star airports to add them to your favorites."
      case 'recent':
        return "No recently viewed airports. Start exploring to build your history."
      default:
        return emptyMessage
    }
  }

  const renderContent = () => (
    <>
      {/* Search and Filters */}
      <div className="space-y-3 px-4 pb-3">
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

      {/* Airport List */}
      <ScrollArea style={{ height: showTabs ? `calc(${height} - 180px)` : `calc(${height} - 120px)` }}>
        {filteredAirports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center px-4">{getEmptyMessage()}</p>
          </div>
        ) : (
          <div className="space-y-1 p-4">
            {filteredAirports.map((airport) => {
              const isSelected = selectedAirport?.iata === airport.iata
              const favorite = isFavorite(airport)
              const inComparison = isInComparison(airport.icao)
              
              return (
                <div
                  key={`${airport.iata}-${airport.icao}`}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-200 cursor-pointer animate-in",
                    "hover:bg-accent hover:border-accent-foreground/20 hover:shadow-sm",
                    isSelected && "bg-primary/10 border-primary shadow-sm",
                    inComparison && "ring-2 ring-primary ring-opacity-50"
                  )}
                  onClick={() => handleAirportSelect(airport)}
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
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 text-xs",
                          inComparison && "text-primary"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (inComparison) {
                            removeFromComparison(airport.icao)
                          } else {
                            addToComparison(airport)
                          }
                        }}
                        disabled={!inComparison && !canAddMore}
                        title={!inComparison && !canAddMore ? "Maximum 3 airports for comparison" : "Add to comparison"}
                      >
                        {inComparison ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <BarChart3 className="h-3 w-3 mr-1" />
                        )}
                        Compare
                      </Button>
                      
                      {(useGlobalState || propOnToggleFavorite) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(airport)
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
    </>
  )

  if (isLoading) {
    return <LocationListSkeleton height={height} showTabs={showTabs} />
  }

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
        
        {/* Tabs for switching views when global state is enabled */}
        {useGlobalState && showTabs && (
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                Search
              </TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Favorites ({favoriteCount})
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Recent ({recentCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        {renderContent()}
      </CardContent>
    </Card>
  )
}

export const LocationList = memo(LocationListComponent)
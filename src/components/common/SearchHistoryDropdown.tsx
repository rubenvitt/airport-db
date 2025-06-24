import { useSearchHistory } from '@/contexts/AppContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Clock, X, MapPin, Plane } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface SearchHistoryDropdownProps {
  children?: React.ReactNode
}

export function SearchHistoryDropdown({ children }: SearchHistoryDropdownProps) {
  const { searchHistory, recentAirports, clearSearchHistory } = useSearchHistory()
  
  const hasHistory = searchHistory.length > 0 || recentAirports.length > 0
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Clock className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {!hasHistory ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No search history yet. Start searching for airports!
          </div>
        ) : (
          <>
            {searchHistory.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center justify-between">
              Recent Searches
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearchHistory}
                className="h-auto p-1 text-xs"
              >
                Clear all
              </Button>
            </DropdownMenuLabel>
            {searchHistory.slice(0, 5).map((item, index) => (
              <DropdownMenuItem key={index} asChild>
                <Link
                  to={item.type === 'airport' ? '/airports' : '/flights'}
                  search={item.type === 'airport' ? { code: item.query } : { query: item.query }}
                  className="flex items-center gap-2"
                >
                  {item.type === 'airport' ? (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Plane className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="flex-1">{item.query}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        
        {searchHistory.length > 0 && recentAirports.length > 0 && (
          <DropdownMenuSeparator />
        )}
        
        {recentAirports.length > 0 && (
          <>
            <DropdownMenuLabel>Recent Airports</DropdownMenuLabel>
            {recentAirports.slice(0, 5).map((airport) => (
              <DropdownMenuItem key={airport.iata} asChild>
                <Link
                  to="/airports/$iataCode"
                  params={{ iataCode: airport.iata }}
                  className="flex items-center gap-2"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{airport.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {airport.city}, {airport.country}
                    </div>
                  </div>
                  <span className="text-xs font-medium">{airport.iata}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </>
        )}
        </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
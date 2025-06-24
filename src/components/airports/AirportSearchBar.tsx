import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Search, X, Loader2, Plane, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { commonAirports } from '@/data/common-airports'

interface AirportSearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  defaultValue?: string
  isLoading?: boolean
  className?: string
  debounceMs?: number
  autoFocus?: boolean
}

interface AirportSuggestion {
  iata: string
  icao: string
  name: string
  city: string
  country: string
}

export function AirportSearchBar({
  onSearch,
  placeholder = 'Search by IATA or ICAO code...',
  defaultValue = '',
  isLoading = false,
  className,
  debounceMs = 300,
  autoFocus = false,
}: AirportSearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter suggestions based on input
  const suggestions = useMemo(() => {
    if (!value || value.length < 2) return []
    
    const upperValue = value.toUpperCase()
    
    // Filter airports by IATA, ICAO, name, or city
    return commonAirports.filter(airport => 
      airport.iata.includes(upperValue) ||
      airport.icao.includes(upperValue) ||
      airport.name.toUpperCase().includes(upperValue) ||
      airport.city.toUpperCase().includes(upperValue)
    ).slice(0, 8) // Limit to 8 suggestions
  }, [value])

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          const selected = suggestions[selectedSuggestionIndex]
          handleSelectSuggestion(selected)
        } else if (value.length === 3 || value.length === 4) {
          // Direct search if valid IATA or ICAO code
          onSearch(value.toUpperCase())
          setShowSuggestions(false)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }, [showSuggestions, suggestions, selectedSuggestionIndex, value, onSearch])

  const handleSelectSuggestion = useCallback((airport: AirportSuggestion) => {
    // Default to IATA code as it's shorter and more commonly used
    setValue(airport.iata)
    onSearch(airport.iata)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
  }, [onSearch])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase()
    setValue(newValue)
    setShowSuggestions(true)
    setSelectedSuggestionIndex(-1)
    
    // Auto-search if valid IATA (3 letters) or ICAO (4 letters) code
    if ((newValue.length === 3 || newValue.length === 4) && /^[A-Z]+$/.test(newValue)) {
      const timer = setTimeout(() => {
        onSearch(newValue)
      }, debounceMs)
      return () => clearTimeout(timer)
    }
  }, [onSearch, debounceMs])

  const handleClear = useCallback(() => {
    setValue('')
    onSearch('')
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    inputRef.current?.focus()
  }, [onSearch])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (value.length === 3 || value.length === 4) {
      onSearch(value.toUpperCase())
      setShowSuggestions(false)
    }
  }, [value, onSearch])

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('relative', className)}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 uppercase"
          autoFocus={autoFocus}
          aria-label="Search airports"
          aria-autocomplete="list"
          aria-controls="airport-suggestions"
          aria-expanded={showSuggestions && suggestions.length > 0}
          autoComplete="off"
        />
        
        {/* Loading indicator or clear button */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClear}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id="airport-suggestions"
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {suggestions.map((airport, index) => (
            <div
              key={`${airport.iata}-${airport.icao}`}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-sm hover:bg-accent',
                selectedSuggestionIndex === index && 'bg-accent'
              )}
              onClick={() => handleSelectSuggestion(airport)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
              role="option"
              aria-selected={selectedSuggestionIndex === index}
            >
              <Plane className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{airport.iata}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{airport.icao}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="truncate">{airport.name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{airport.city}, {airport.country}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      {showSuggestions && value.length > 0 && value.length < 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-sm">
          Type at least 2 characters to see suggestions
        </div>
      )}
    </form>
  )
}
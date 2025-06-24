import { useCallback, useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  defaultValue?: string
  isLoading?: boolean
  className?: string
  debounceMs?: number
  minLength?: number
  showClearButton?: boolean
  autoFocus?: boolean
}

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  defaultValue = '',
  isLoading = false,
  className,
  debounceMs = 300,
  minLength = 2,
  showClearButton = true,
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const [debouncedValue, setDebouncedValue] = useState(defaultValue)

  // Debounce the search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [value, debounceMs])

  // Trigger search when debounced value changes
  useEffect(() => {
    if (debouncedValue.length >= minLength || debouncedValue.length === 0) {
      onSearch(debouncedValue)
    }
  }, [debouncedValue, minLength, onSearch])

  const handleClear = useCallback(() => {
    setValue('')
    setDebouncedValue('')
    onSearch('')
  }, [onSearch])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (value.length >= minLength || value.length === 0) {
        setDebouncedValue(value)
        onSearch(value)
      }
    },
    [value, minLength, onSearch],
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('relative flex items-center', className)}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
          aria-label="Search"
        />
        
        {/* Loading indicator or clear button */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            showClearButton && value && (
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
    </form>
  )
}
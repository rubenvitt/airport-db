import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { Airport } from '@/types/airport'

interface ComparisonContextType {
  comparedAirports: Array<Airport>
  addToComparison: (airport: Airport) => void
  removeFromComparison: (icao: string) => void
  clearComparison: () => void
  isInComparison: (icao: string) => boolean
  canAddMore: boolean
}

const MAX_COMPARISON_AIRPORTS = 3

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined)

export function ComparisonProvider({ children }: { children: React.ReactNode }) {
  const [comparedAirports, setComparedAirports] = useState<Array<Airport>>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Load from localStorage after hydration
    const stored = localStorage.getItem('comparedAirports')
    if (stored) {
      setComparedAirports(JSON.parse(stored))
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('comparedAirports', JSON.stringify(comparedAirports))
    }
  }, [comparedAirports, isHydrated])

  const addToComparison = useCallback((airport: Airport) => {
    setComparedAirports(prev => {
      if (prev.length >= MAX_COMPARISON_AIRPORTS) return prev
      if (prev.some(a => a.icao === airport.icao)) return prev
      return [...prev, airport]
    })
  }, [])

  const removeFromComparison = useCallback((icao: string) => {
    setComparedAirports(prev => prev.filter(a => a.icao !== icao))
  }, [])

  const clearComparison = useCallback(() => {
    setComparedAirports([])
  }, [])

  const isInComparison = useCallback((icao: string) => {
    return comparedAirports.some(a => a.icao === icao)
  }, [comparedAirports])

  const canAddMore = comparedAirports.length < MAX_COMPARISON_AIRPORTS

  return (
    <ComparisonContext.Provider
      value={{
        comparedAirports,
        addToComparison,
        removeFromComparison,
        clearComparison,
        isInComparison,
        canAddMore
      }}
    >
      {children}
    </ComparisonContext.Provider>
  )
}

export function useComparison() {
  const context = useContext(ComparisonContext)
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider')
  }
  return context
}
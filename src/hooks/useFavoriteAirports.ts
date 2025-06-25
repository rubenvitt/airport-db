import { useState, useEffect } from 'react'

const FAVORITES_KEY = 'favorite-airports'

export function useFavoriteAirports() {
  const [favoriteAirports, setFavoriteAirports] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY)
      if (stored) {
        setFavoriteAirports(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteAirports))
      } catch (error) {
        console.error('Error saving favorites:', error)
      }
    }
  }, [favoriteAirports, isLoading])

  // Toggle a favorite airport
  const toggleFavorite = (icaoCode: string) => {
    setFavoriteAirports((prev) => {
      const exists = prev.includes(icaoCode)
      if (exists) {
        return prev.filter((code) => code !== icaoCode)
      } else {
        return [...prev, icaoCode]
      }
    })
  }

  // Check if an airport is favorited
  const isFavorite = (icaoCode: string) => {
    return favoriteAirports.includes(icaoCode)
  }

  // Add a favorite
  const addFavorite = (icaoCode: string) => {
    if (!isFavorite(icaoCode)) {
      setFavoriteAirports((prev) => [...prev, icaoCode])
    }
  }

  // Remove a favorite
  const removeFavorite = (icaoCode: string) => {
    setFavoriteAirports((prev) => prev.filter((code) => code !== icaoCode))
  }

  // Clear all favorites
  const clearFavorites = () => {
    setFavoriteAirports([])
  }

  return {
    favoriteAirports,
    isLoading,
    toggleFavorite,
    isFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
  }
}
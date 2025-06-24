import { useEffect } from 'react'
import { useComparison } from '@/contexts/ComparisonContext'
import { useEventBus, EVENTS } from '@/lib/eventBus'
import type { Airport } from '@/types/airport'

export function useComparisonShortcuts(
  selectedAirport: Airport | null,
  isComparisonPanelOpen: boolean,
  setComparisonPanelOpen: (open: boolean) => void
) {
  const { addToComparison, removeFromComparison, isInComparison, clearComparison, canAddMore } = useComparison()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Cmd/Ctrl + K to toggle comparison panel
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setComparisonPanelOpen(!isComparisonPanelOpen)
      }

      // Cmd/Ctrl + Shift + C to clear comparison
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        clearComparison()
      }

      // Cmd/Ctrl + Enter to add/remove selected airport from comparison
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && selectedAirport) {
        e.preventDefault()
        if (isInComparison(selectedAirport.icao)) {
          removeFromComparison(selectedAirport.icao)
        } else if (canAddMore) {
          addToComparison(selectedAirport)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedAirport,
    isComparisonPanelOpen,
    setComparisonPanelOpen,
    addToComparison,
    removeFromComparison,
    isInComparison,
    clearComparison,
    canAddMore
  ])

  // Listen for comparison events
  useEventBus(EVENTS.COMPARISON_UPDATED, () => {
    // Could add visual feedback here
  })
}
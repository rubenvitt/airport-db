// Hook for using event bus in React components
import { useEffect } from 'react'

type EventCallback = (...args: Array<any>) => void

interface EventBus {
  on: (event: string, callback: EventCallback) => () => void
  off: (event: string, callback: EventCallback) => void
  emit: (event: string, ...args: Array<any>) => void
  once: (event: string, callback: EventCallback) => () => void
}

class EventBusImpl implements EventBus {
  private events: Map<string, Set<EventCallback>> = new Map()

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.delete(callback)
      if (callbacks.size === 0) {
        this.events.delete(event)
      }
    }
  }

  emit(event: string, ...args: Array<any>): void {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error)
        }
      })
    }
  }

  once(event: string, callback: EventCallback): () => void {
    const wrappedCallback = (...args: Array<any>) => {
      callback(...args)
      this.off(event, wrappedCallback)
    }
    return this.on(event, wrappedCallback)
  }
}

// Create singleton instance
export const eventBus = new EventBusImpl()

// Define event types for type safety
export const EVENTS = {
  // Airport selection events
  AIRPORT_SELECTED: 'airport:selected',
  AIRPORT_DESELECTED: 'airport:deselected',
  
  // Search events
  SEARCH_STARTED: 'search:started',
  SEARCH_COMPLETED: 'search:completed',
  SEARCH_FAILED: 'search:failed',
  SEARCH_CLEARED: 'search:cleared',
  
  // Map events
  MAP_CLICKED: 'map:clicked',
  MAP_MOVED: 'map:moved',
  MAP_ZOOMED: 'map:zoomed',
  MARKER_DRAGGED: 'marker:dragged',
  
  // Favorite events
  FAVORITE_ADDED: 'favorite:added',
  FAVORITE_REMOVED: 'favorite:removed',
  
  // Comparison events
  COMPARISON_ADDED: 'comparison:added',
  COMPARISON_REMOVED: 'comparison:removed',
  COMPARISON_CLEARED: 'comparison:cleared',
  
  // UI events
  VIEW_MODE_CHANGED: 'ui:viewModeChanged',
  THEME_CHANGED: 'ui:themeChanged',
  SIDEBAR_TOGGLED: 'ui:sidebarToggled',
} as const

// Type-safe event emitter helper functions
export function emitAirportSelected(airport: any) {
  eventBus.emit(EVENTS.AIRPORT_SELECTED, airport)
}

export function emitSearchStarted(query: string) {
  eventBus.emit(EVENTS.SEARCH_STARTED, query)
}

export function emitSearchCompleted(results: Array<any>) {
  eventBus.emit(EVENTS.SEARCH_COMPLETED, results)
}

export function emitSearchFailed(error: any) {
  eventBus.emit(EVENTS.SEARCH_FAILED, error)
}

export function emitMapMoved(center: [number, number], zoom: number) {
  eventBus.emit(EVENTS.MAP_MOVED, center, zoom)
}

export function useEventBus(event: string, handler: EventCallback) {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, handler)
    return unsubscribe
  }, [event, handler])
}
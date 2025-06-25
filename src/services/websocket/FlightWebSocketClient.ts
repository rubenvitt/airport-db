import type { FlightState, FlightsResponse } from '@/types/flight'

export interface FlightWebSocketMessage {
  type: 'flight_update' | 'bulk_update' | 'connection_status' | 'error'
  data: FlightState | FlightsResponse | { status: string } | { error: string }
  timestamp: number
}

export interface FlightWebSocketConfig {
  url: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export interface FlightWebSocketCallbacks {
  onFlightUpdate?: (flight: FlightState) => void
  onBulkUpdate?: (flights: FlightsResponse) => void
  onConnectionChange?: (connected: boolean) => void
  onError?: (error: Error) => void
}

export class FlightWebSocketClient {
  private ws: WebSocket | null = null
  private config: FlightWebSocketConfig
  private callbacks: FlightWebSocketCallbacks
  private reconnectAttempts = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  
  constructor(config: FlightWebSocketConfig, callbacks: FlightWebSocketCallbacks = {}) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    }
    this.callbacks = callbacks
  }

  connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    this.isConnecting = true
    
    try {
      this.ws = new WebSocket(this.config.url)
      this.setupEventListeners()
    } catch (error) {
      this.isConnecting = false
      this.handleError(new Error(`Failed to create WebSocket connection: ${error}`))
    }
  }

  disconnect(): void {
    this.clearTimers()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
    
    this.callbacks.onConnectionChange?.(false)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.callbacks.onConnectionChange?.(true)
      this.startHeartbeat()
    }

    this.ws.onclose = (event) => {
      this.isConnecting = false
      this.clearTimers()
      this.callbacks.onConnectionChange?.(false)
      
      // Only attempt reconnect if not a normal closure
      if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      this.isConnecting = false
      this.handleError(new Error('WebSocket connection error'))
    }

    this.ws.onmessage = (event) => {
      try {
        const message: FlightWebSocketMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        this.handleError(new Error(`Failed to parse WebSocket message: ${error}`))
      }
    }
  }

  private handleMessage(message: FlightWebSocketMessage): void {
    switch (message.type) {
      case 'flight_update':
        this.callbacks.onFlightUpdate?.(message.data as FlightState)
        break
      
      case 'bulk_update':
        this.callbacks.onBulkUpdate?.(message.data as FlightsResponse)
        break
      
      case 'connection_status':
        // Handle connection status updates if needed
        break
      
      case 'error':
        const errorData = message.data as { error: string }
        this.handleError(new Error(errorData.error))
        break
      
      default:
        console.warn('Unknown WebSocket message type:', message.type)
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.ws?.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, this.config.heartbeatInterval!)
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
      this.connect()
    }, this.config.reconnectInterval!)
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private handleError(error: Error): void {
    console.error('FlightWebSocketClient error:', error)
    this.callbacks.onError?.(error)
  }

  // Subscribe to specific flight updates
  subscribeToFlight(icao24: string): void {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify({
        type: 'subscribe_flight',
        icao24,
        timestamp: Date.now()
      }))
    }
  }

  // Unsubscribe from specific flight updates
  unsubscribeFromFlight(icao24: string): void {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify({
        type: 'unsubscribe_flight',
        icao24,
        timestamp: Date.now()
      }))
    }
  }

  // Subscribe to flights in a geographic area
  subscribeToArea(bounds: { lamin: number; lomin: number; lamax: number; lomax: number }): void {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify({
        type: 'subscribe_area',
        bounds,
        timestamp: Date.now()
      }))
    }
  }
}
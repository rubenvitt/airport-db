import WebSocket, { WebSocketServer } from 'ws'
import type { FlightState } from '@/types/flight'
import type { FlightWebSocketMessage } from '@/services/websocket/FlightWebSocketClient'

export interface WebSocketConnection {
  ws: WebSocket
  subscribedFlights: Set<string>
  subscribedAreas: Array<{ lamin: number; lomin: number; lamax: number; lomax: number }>
}

export interface FlightWebSocketServerOptions {
  port?: number
  updateInterval?: number
  maxConnections?: number
}

export class FlightWebSocketServer {
  private wss: WebSocketServer
  private connections = new Map<WebSocket, WebSocketConnection>()
  private updateTimer: NodeJS.Timeout | null = null
  private options: Required<FlightWebSocketServerOptions>

  constructor(options: FlightWebSocketServerOptions = {}) {
    this.options = {
      port: 3001,
      updateInterval: 5000, // 5 seconds
      maxConnections: 100,
      ...options,
    }

    this.wss = new WebSocketServer({
      port: this.options.port,
      path: '/ws/flights',
    })

    this.setupServer()
    console.log(`Flight WebSocket server started on port ${this.options.port}`)
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established')

      // Check connection limit
      if (this.connections.size >= this.options.maxConnections) {
        ws.close(1013, 'Server overloaded')
        return
      }

      // Initialize connection
      const connection: WebSocketConnection = {
        ws,
        subscribedFlights: new Set(),
        subscribedAreas: [],
      }
      this.connections.set(ws, connection)

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connection_status',
        data: { status: 'connected' },
        timestamp: Date.now(),
      })

      // Set up event handlers
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleClientMessage(connection, message)
        } catch (error) {
          console.error('Error parsing client message:', error)
          this.sendMessage(ws, {
            type: 'error',
            data: { error: 'Invalid message format' },
            timestamp: Date.now(),
          })
        }
      })

      ws.on('close', () => {
        console.log('WebSocket connection closed')
        this.connections.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.connections.delete(ws)
      })

      ws.on('pong', () => {
        // Handle pong for keep-alive
      })
    })

    // Start periodic updates
    this.startPeriodicUpdates()
  }

  private handleClientMessage(connection: WebSocketConnection, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendMessage(connection.ws, {
          type: 'connection_status',
          data: { status: 'pong' },
          timestamp: Date.now(),
        })
        break

      case 'subscribe_flight':
        if (message.icao24) {
          connection.subscribedFlights.add(message.icao24)
          console.log(`Client subscribed to flight: ${message.icao24}`)
        }
        break

      case 'unsubscribe_flight':
        if (message.icao24) {
          connection.subscribedFlights.delete(message.icao24)
          console.log(`Client unsubscribed from flight: ${message.icao24}`)
        }
        break

      case 'subscribe_area':
        if (message.bounds) {
          connection.subscribedAreas.push(message.bounds)
          console.log('Client subscribed to area:', message.bounds)
        }
        break

      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  private sendMessage(ws: WebSocket, message: FlightWebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private startPeriodicUpdates(): void {
    this.updateTimer = setInterval(async () => {
      await this.broadcastFlightUpdates()
    }, this.options.updateInterval)
  }

  private async broadcastFlightUpdates(): Promise<void> {
    if (this.connections.size === 0) return

    try {
      // For demo purposes, generate mock flight data
      // In a real implementation, this would fetch from OpenSky API or another data source
      const mockFlights = this.generateMockFlightData()

      this.connections.forEach((connection) => {
        const relevantFlights = this.filterFlightsForConnection(mockFlights, connection)
        
        if (relevantFlights.length > 0) {
          this.sendMessage(connection.ws, {
            type: 'bulk_update',
            data: {
              time: Date.now(),
              states: relevantFlights,
            },
            timestamp: Date.now(),
          })
        }
      })
    } catch (error) {
      console.error('Error broadcasting flight updates:', error)
    }
  }

  private filterFlightsForConnection(flights: FlightState[], connection: WebSocketConnection): FlightState[] {
    return flights.filter(flight => {
      // Include if subscribed to specific flight
      if (connection.subscribedFlights.has(flight.icao24)) {
        return true
      }

      // Include if flight is in subscribed area
      if (flight.latitude !== null && flight.longitude !== null) {
        return connection.subscribedAreas.some(area => 
          flight.latitude! >= area.lamin &&
          flight.latitude! <= area.lamax &&
          flight.longitude! >= area.lomin &&
          flight.longitude! <= area.lomax
        )
      }

      return false
    })
  }

  private generateMockFlightData(): FlightState[] {
    // Generate mock flight data for testing
    const mockFlights: FlightState[] = []
    
    for (let i = 0; i < 10; i++) {
      mockFlights.push({
        icao24: Math.random().toString(16).substring(2, 8),
        callsign: `FL${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        origin_country: 'Germany',
        time_position: Math.floor(Date.now() / 1000),
        last_contact: Math.floor(Date.now() / 1000),
        longitude: -180 + Math.random() * 360,
        latitude: -90 + Math.random() * 180,
        baro_altitude: 1000 + Math.random() * 40000,
        on_ground: Math.random() < 0.1,
        velocity: 100 + Math.random() * 800,
        true_track: Math.random() * 360,
        vertical_rate: -50 + Math.random() * 100,
        sensors: null,
        geo_altitude: 1000 + Math.random() * 40000,
        squawk: Math.floor(Math.random() * 8777).toString(),
        spi: false,
        position_source: 0,
      })
    }

    return mockFlights
  }

  // Broadcast a specific flight update to all interested clients
  public broadcastFlightUpdate(flight: FlightState): void {
    this.connections.forEach((connection) => {
      if (connection.subscribedFlights.has(flight.icao24) ||
          this.isFlightInSubscribedAreas(flight, connection.subscribedAreas)) {
        this.sendMessage(connection.ws, {
          type: 'flight_update',
          data: flight,
          timestamp: Date.now(),
        })
      }
    })
  }

  private isFlightInSubscribedAreas(
    flight: FlightState, 
    areas: Array<{ lamin: number; lomin: number; lamax: number; lomax: number }>
  ): boolean {
    if (flight.latitude === null || flight.longitude === null) return false

    return areas.some(area => 
      flight.latitude! >= area.lamin &&
      flight.latitude! <= area.lamax &&
      flight.longitude! >= area.lomin &&
      flight.longitude! <= area.lomax
    )
  }

  public close(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }

    this.connections.forEach((connection) => {
      connection.ws.close(1000, 'Server shutting down')
    })

    this.wss.close()
    console.log('Flight WebSocket server closed')
  }

  public getConnectionCount(): number {
    return this.connections.size
  }
}
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FlightWebSocketClient } from '../FlightWebSocketClient'
import type { FlightState } from '@/types/flight'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Simulate connection opening asynchronously
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }))
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

describe('FlightWebSocketClient', () => {
  let client: FlightWebSocketClient
  let mockCallbacks: any

  beforeEach(() => {
    mockCallbacks = {
      onFlightUpdate: vi.fn(),
      onBulkUpdate: vi.fn(),
      onConnectionChange: vi.fn(),
      onError: vi.fn(),
    }

    client = new FlightWebSocketClient(
      { url: 'ws://localhost:3001/ws/flights' },
      mockCallbacks
    )
  })

  afterEach(() => {
    if (client) {
      client.disconnect()
    }
  })

  it('should create a WebSocket client instance', () => {
    expect(client).toBeInstanceOf(FlightWebSocketClient)
  })

  it('should connect to WebSocket server', async () => {
    client.connect()
    
    // Wait for async connection
    await new Promise(resolve => setTimeout(resolve, 20))
    
    expect(client.isConnected()).toBe(true)
    expect(mockCallbacks.onConnectionChange).toHaveBeenCalledWith(true)
  })

  it('should disconnect from WebSocket server', async () => {
    client.connect()
    await new Promise(resolve => setTimeout(resolve, 20))
    
    client.disconnect()
    
    expect(client.isConnected()).toBe(false)
    expect(mockCallbacks.onConnectionChange).toHaveBeenCalledWith(false)
  })

  it('should handle flight update messages', async () => {
    client.connect()
    await new Promise(resolve => setTimeout(resolve, 20))

    const mockFlight: FlightState = {
      icao24: 'abc123',
      callsign: 'FL001',
      origin_country: 'Germany',
      time_position: Date.now(),
      last_contact: Date.now(),
      longitude: 13.4050,
      latitude: 52.5200,
      baro_altitude: 10000,
      on_ground: false,
      velocity: 500,
      true_track: 90,
      vertical_rate: 0,
      sensors: null,
      geo_altitude: 10000,
      squawk: '1234',
      spi: false,
      position_source: 0,
    }

    // Simulate receiving a flight update message
    const mockMessage = {
      data: JSON.stringify({
        type: 'flight_update',
        data: mockFlight,
        timestamp: Date.now(),
      })
    }

    // Trigger the message handler directly
    if ((client as any).ws?.onmessage) {
      (client as any).ws.onmessage(mockMessage)
    }

    expect(mockCallbacks.onFlightUpdate).toHaveBeenCalledWith(mockFlight)
  })

  it('should handle error messages', async () => {
    client.connect()
    await new Promise(resolve => setTimeout(resolve, 20))

    const errorMessage = {
      data: JSON.stringify({
        type: 'error',
        data: { error: 'Connection failed' },
        timestamp: Date.now(),
      })
    }

    // Trigger the message handler directly
    if ((client as any).ws?.onmessage) {
      (client as any).ws.onmessage(errorMessage)
    }

    expect(mockCallbacks.onError).toHaveBeenCalled()
  })

  it('should subscribe to specific flights', async () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send')
    
    client.connect()
    await new Promise(resolve => setTimeout(resolve, 20))
    
    client.subscribeToFlight('abc123')
    
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"subscribe_flight"')
    )
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"icao24":"abc123"')
    )
  })

  it('should subscribe to geographic areas', async () => {
    const sendSpy = vi.spyOn(MockWebSocket.prototype, 'send')
    
    client.connect()
    await new Promise(resolve => setTimeout(resolve, 20))
    
    const bounds = { lamin: 52.0, lomin: 13.0, lamax: 53.0, lomax: 14.0 }
    client.subscribeToArea(bounds)
    
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"subscribe_area"')
    )
    expect(sendSpy).toHaveBeenCalledWith(
      expect.stringContaining('"bounds"')
    )
  })
})
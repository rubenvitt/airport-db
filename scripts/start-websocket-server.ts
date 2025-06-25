#!/usr/bin/env tsx

import { FlightWebSocketServer } from '../src/server/websocket/FlightWebSocketServer'

// Start the WebSocket server for development
const server = new FlightWebSocketServer({
  port: 3001,
  updateInterval: 3000, // Update every 3 seconds for development
  maxConnections: 50,
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...')
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\nShutting down WebSocket server...')
  server.close()
  process.exit(0)
})

console.log('WebSocket server is running. Press Ctrl+C to stop.')
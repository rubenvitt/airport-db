'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Info, Map, Plane } from 'lucide-react'
import Link from 'next/link'
import { FlightTracker } from '@/components/flights'
import { FlightWebSocketProvider } from '@/contexts/FlightWebSocketContext'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function LiveFlightMapPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="container py-8 max-w-full">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-center">
            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading flight map...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <FlightWebSocketProvider>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link href="/flights">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Flights
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Plane className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Live Flight Map</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Alert className="max-w-md py-2">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-sm">Real-time Tracking</AlertTitle>
                <AlertDescription className="text-xs">
                  Click on any aircraft to see details and flight path
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <FlightTracker 
            initialCenter={[50.0, 10.0]} // Europe centered
            initialZoom={5}
            height="100%"
          />
        </div>
      </div>
    </FlightWebSocketProvider>
  )
}
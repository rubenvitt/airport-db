'use client'

import { useState } from 'react'
import { MapPin, Plane, AlertCircle, Navigation } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../../src/components/ui/alert'
import { Button } from '../../src/components/ui/button'
import Link from 'next/link'

export default function LiveFlightsPage() {
  const [selectedView, setSelectedView] = useState<'map' | 'list'>('map')

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Plane className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Live Flight Tracking</h1>
        </div>
        <p className="text-muted-foreground">
          Track flights in real-time with data from OpenSky Network. 
          View current positions, altitude, speed, and flight paths.
        </p>
      </div>

      {/* Alert for authentication */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>OpenSky Network Authentication</AlertTitle>
        <AlertDescription>
          For better performance and higher rate limits, please configure your OpenSky Network credentials in the settings.
          Free tier has limited access to real-time data.
        </AlertDescription>
      </Alert>

      {/* View Toggle */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Flight View</CardTitle>
              <CardDescription>Choose how you want to view flights</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedView === 'map' ? 'default' : 'outline'}
                onClick={() => setSelectedView('map')}
                size="sm"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Map View
              </Button>
              <Button
                variant={selectedView === 'list' ? 'default' : 'outline'}
                onClick={() => setSelectedView('list')}
                size="sm"
              >
                <Navigation className="h-4 w-4 mr-2" />
                List View
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
          {selectedView === 'map' ? (
            <div className="text-center py-12">
              <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Live Map Coming Soon</h3>
              <p className="text-muted-foreground mb-4">
                Interactive flight tracking map is under development.
              </p>
              <Link href="/flights/live-map" className="text-primary hover:underline">
                Try the beta version →
              </Link>
            </div>
          ) : (
            <div className="text-center py-12">
              <Navigation className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Flight List</h3>
              <p className="text-muted-foreground">
                Search for specific flights or browse flights by airport.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Popular Airports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {['LAX', 'JFK', 'LHR', 'CDG', 'DXB'].map((code) => (
                <Link
                  key={code}
                  href={`/airports/${code}`}
                  className="block text-sm text-muted-foreground hover:text-foreground"
                >
                  View {code} flights →
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Flight Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/settings"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Configure API credentials →
              </Link>
              <Link
                href="/airports"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Search airports →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <a
                href="https://opensky-network.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                OpenSky Network →
              </a>
              <a
                href="https://github.com/openskynetwork/opensky-api"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                API Documentation →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
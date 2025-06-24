import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Airport } from '@/types/airport'

interface ComparisonChartProps {
  airports: Airport[]
}

export function ComparisonChart({ airports }: ComparisonChartProps) {
  // Prepare data for elevation comparison
  const elevationData = airports.map(airport => ({
    name: airport.iata,
    elevation: airport.elevation_ft,
    elevationMeters: Math.round(airport.elevation_ft * 0.3048)
  }))

  // Prepare data for coordinates/location radar chart
  const locationData = airports.map(airport => ({
    name: airport.iata,
    latitude: Math.abs(airport.latitude),
    longitude: Math.abs(airport.longitude)
  }))

  // Prepare timezone data
  const timezoneData = airports.map(airport => {
    // Extract UTC offset from timezone string if possible
    const match = airport.timezone.match(/UTC([+-]\d+)/)
    const offset = match ? parseInt(match[1]) : 0
    return {
      name: airport.iata,
      timezone: airport.timezone,
      utcOffset: offset
    }
  })

  // Prepare country/region distribution
  const countryData = airports.reduce((acc, airport) => {
    const country = airport.country
    const existing = acc.find(item => item.country === country)
    if (existing) {
      existing.count += 1
      existing.airports.push(airport.iata)
    } else {
      acc.push({ country, count: 1, airports: [airport.iata] })
    }
    return acc
  }, [] as { country: string; count: number; airports: string[] }[])

  return (
    <div className="space-y-4 mt-6">
      <Tabs defaultValue="elevation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="elevation">Elevation</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="timezone">Timezone</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="elevation" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Elevation Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={elevationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background border rounded p-2 shadow-sm">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm">{data.elevation.toLocaleString()} ft</p>
                            <p className="text-sm text-muted-foreground">{data.elevationMeters.toLocaleString()} m</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="elevation" fill="#3b82f6" name="Elevation (ft)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Geographic Position</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={locationData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis angle={90} domain={[0, 180]} />
                  <Radar name="Latitude" dataKey="latitude" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Longitude" dataKey="longitude" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timezone" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timezone Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timezoneData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[-12, 12]} ticks={[-12, -9, -6, -3, 0, 3, 6, 9, 12]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background border rounded p-2 shadow-sm">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm">{data.timezone}</p>
                            <p className="text-sm">UTC{data.utcOffset >= 0 ? '+' : ''}{data.utcOffset}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="utcOffset" fill="#f59e0b" name="UTC Offset" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Country Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {countryData.map(item => (
                  <div key={item.country} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{item.country}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.airports.join(', ')}
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {item.count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
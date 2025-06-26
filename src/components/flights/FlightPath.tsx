import { memo, useMemo } from 'react'
import type { FlightTrack } from '@/types/flight'

interface FlightPathProps {
  track: FlightTrack
  Polyline: any // Leaflet Polyline component
  isSelected?: boolean
  maxPoints?: number
  showAltitudeGradient?: boolean
}

// Color scale for altitude (in meters)
const getAltitudeColor = (altitude: number | null): string => {
  if (altitude === null || altitude === 0) return '#10b981' // green for ground
  
  // Normalize altitude (0-15000m range)
  const normalized = Math.min(Math.max(altitude, 0), 15000) / 15000
  
  // Green (ground) -> Yellow (mid) -> Red (high)
  if (normalized < 0.5) {
    // Green to Yellow
    const ratio = normalized * 2
    const r = Math.round(34 + (255 - 34) * ratio)
    const g = Math.round(197 + (235 - 197) * ratio)
    const b = Math.round(94 + (59 - 94) * ratio)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // Yellow to Red
    const ratio = (normalized - 0.5) * 2
    const r = 255
    const g = Math.round(235 - 235 * ratio)
    const b = Math.round(59 - 59 * ratio)
    return `rgb(${r}, ${g}, ${b})`
  }
}

// Douglas-Peucker algorithm for path simplification
function simplifyPath(points: Array<[number, number, number | null]>, tolerance: number): Array<[number, number, number | null]> {
  if (points.length <= 2) return points
  
  // Find the point with the maximum distance from the line
  let maxDistance = 0
  let maxIndex = 0
  
  const start = points[0]
  const end = points[points.length - 1]
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const leftPath = simplifyPath(points.slice(0, maxIndex + 1), tolerance)
    const rightPath = simplifyPath(points.slice(maxIndex), tolerance)
    
    return leftPath.slice(0, -1).concat(rightPath)
  } else {
    return [start, end]
  }
}

// Calculate perpendicular distance from point to line
function perpendicularDistance(
  point: [number, number, number | null],
  lineStart: [number, number, number | null],
  lineEnd: [number, number, number | null]
): number {
  const [px, py] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd
  
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  
  let param = -1
  if (lenSq !== 0) {
    param = dot / lenSq
  }
  
  let xx, yy
  
  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }
  
  const dx = px - xx
  const dy = py - yy
  
  return Math.sqrt(dx * dx + dy * dy)
}

export const FlightPath = memo(({ 
  track, 
  Polyline,
  isSelected = false,
  maxPoints = 500,
  showAltitudeGradient = true
}: FlightPathProps) => {
  // Process track points
  const { positions, segments } = useMemo(() => {
    if (!track.path || track.path.length === 0) {
      return { positions: [], segments: [] }
    }
    
    // Extract valid positions with lat/lon
    const validPoints = track.path
      .filter(point => point[1] !== null && point[2] !== null)
      .map(point => [point[1]!, point[2]!, point[3]] as [number, number, number | null])
    
    // Simplify path if too many points
    let processedPoints = validPoints
    if (validPoints.length > maxPoints) {
      // Calculate tolerance based on number of points
      const tolerance = 0.0001 * (validPoints.length / maxPoints)
      processedPoints = simplifyPath(validPoints, tolerance)
    }
    
    // For altitude gradient, split into segments by altitude
    if (showAltitudeGradient && processedPoints.length > 1) {
      const segments: Array<{
        positions: Array<[number, number]>
        color: string
      }> = []
      
      for (let i = 0; i < processedPoints.length - 1; i++) {
        const startPoint = processedPoints[i]
        const endPoint = processedPoints[i + 1]
        
        // Use average altitude for segment color
        const avgAltitude = ((startPoint[2] || 0) + (endPoint[2] || 0)) / 2
        const color = getAltitudeColor(avgAltitude)
        
        segments.push({
          positions: [
            [startPoint[0], startPoint[1]],
            [endPoint[0], endPoint[1]]
          ],
          color
        })
      }
      
      return { positions: [], segments }
    }
    
    // Simple path without gradient
    const positions = processedPoints.map(p => [p[0], p[1]] as [number, number])
    return { positions, segments: [] }
  }, [track, maxPoints, showAltitudeGradient])
  
  // Don't render if no valid positions
  if (positions.length === 0 && segments.length === 0) {
    return null
  }
  
  // Render segmented path for altitude gradient
  if (segments.length > 0) {
    return (
      <>
        {segments.map((segment, index) => (
          <Polyline
            key={`${track.icao24}-segment-${index}`}
            positions={segment.positions}
            pathOptions={{
              color: segment.color,
              weight: isSelected ? 4 : 2,
              opacity: isSelected ? 0.9 : 0.6,
              smoothFactor: 1
            }}
          />
        ))}
      </>
    )
  }
  
  // Render simple path
  return (
    <Polyline
      positions={positions}
      pathOptions={{
        color: isSelected ? '#ef4444' : '#3b82f6',
        weight: isSelected ? 4 : 2,
        opacity: isSelected ? 0.9 : 0.6,
        dashArray: isSelected ? null : '5, 10',
        smoothFactor: 1
      }}
    />
  )
})

FlightPath.displayName = 'FlightPath'
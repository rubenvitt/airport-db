import { Suspense, lazy } from 'react'
import type { MapViewProps } from './MapView'
import { LoadingSpinner } from '@/components/common'

const MapView = lazy(() => import('./MapView').then(module => ({ default: module.MapView })))

export function LazyMapView(props: MapViewProps) {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center bg-muted/20"
          style={{ height: props.height || '400px' }}
        >
          <LoadingSpinner text="Loading map..." />
        </div>
      }
    >
      <MapView {...props} />
    </Suspense>
  )
}
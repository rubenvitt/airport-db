import { Suspense, lazy } from 'react'
import type { ComparisonChartProps } from './ComparisonChart'
import { LoadingSpinner } from '@/components/common'

const ComparisonChart = lazy(() => import('./ComparisonChart').then(module => ({ default: module.ComparisonChart })))

export function LazyComparisonChart(props: ComparisonChartProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner text="Loading charts..." />
        </div>
      }
    >
      <ComparisonChart {...props} />
    </Suspense>
  )
}
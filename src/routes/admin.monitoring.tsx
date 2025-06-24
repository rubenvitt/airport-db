import { createFileRoute } from '@tanstack/react-router'
import { CacheMetricsDashboard } from '@/components/monitoring/CacheMetricsDashboard'

export const Route = createFileRoute('/admin/monitoring')({
  component: MonitoringPage,
})

function MonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Monitor cache performance and system metrics
        </p>
      </div>
      
      <CacheMetricsDashboard />
    </div>
  )
}
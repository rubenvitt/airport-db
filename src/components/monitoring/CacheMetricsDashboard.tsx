import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, Database, TrendingUp } from 'lucide-react'
import type { CacheStats, CacheMetrics } from '@/lib/cache'

interface CacheMetricsData {
  stats: CacheStats
  metrics: CacheMetrics
  timestamp: string
}

export function CacheMetricsDashboard() {
  const [data, setData] = useState<CacheMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cache/metrics')
      if (!response.ok) throw new Error('Failed to fetch metrics')
      
      const metricsData = await response.json()
      setData(metricsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const resetStats = async () => {
    try {
      const response = await fetch('/api/cache/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      if (!response.ok) throw new Error('Failed to reset stats')
      
      // Refresh metrics after reset
      await fetchMetrics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error loading metrics: {error}
      </div>
    )
  }

  if (!data) return null

  const { stats, metrics } = data
  const hitRate = metrics.hitRate * 100
  const missRate = metrics.missRate * 100
  const errorRate = metrics.errorRate * 100

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cache Metrics Dashboard</h2>
        <div className="space-x-2">
          <Button
            onClick={fetchMetrics}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={resetStats}
            variant="outline"
            size="sm"
          >
            Reset Stats
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <CardDescription>Cache hit percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hitRate.toFixed(1)}%</div>
            <Progress value={hitRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <CardDescription>Gets + Sets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.totalGets + (metrics.totalSets || 0)).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {metrics.totalGets.toLocaleString()} gets
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <CardDescription>Total storage used</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(metrics.totalSize)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {metrics.entryCount.toLocaleString()} entries
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <CardDescription>GET operation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgGetLatency.toFixed(1)}ms
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              P95: {metrics.p95GetLatency.toFixed(1)}ms
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Hit Rate</span>
                <span className="text-sm font-medium">{hitRate.toFixed(1)}%</span>
              </div>
              <Progress value={hitRate} />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Miss Rate</span>
                <span className="text-sm font-medium">{missRate.toFixed(1)}%</span>
              </div>
              <Progress value={missRate} className="bg-orange-100" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Error Rate</span>
                <span className="text-sm font-medium">{errorRate.toFixed(1)}%</span>
              </div>
              <Progress value={errorRate} className="bg-red-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Last Hour Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Hits</span>
                <span className="text-sm font-medium">
                  {metrics.lastHour.hits.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Misses</span>
                <span className="text-sm font-medium">
                  {metrics.lastHour.misses.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sets</span>
                <span className="text-sm font-medium">
                  {metrics.lastHour.sets.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Errors</span>
                <span className="text-sm font-medium text-red-600">
                  {metrics.lastHour.errors.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Storage Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Size</div>
              <div className="text-lg font-medium">{formatBytes(metrics.totalSize)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Entry Count</div>
              <div className="text-lg font-medium">{metrics.entryCount.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Avg Entry Size</div>
              <div className="text-lg font-medium">{formatBytes(metrics.avgEntrySize)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Errors</div>
              <div className="text-lg font-medium text-red-600">
                {metrics.totalErrors.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-right">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
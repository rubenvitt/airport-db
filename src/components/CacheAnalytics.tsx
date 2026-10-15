// Cache analytics component for monitoring cache performance

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCache } from '@/hooks/useCache'
import { formatDistanceToNow } from 'date-fns'
import { 
  BarChart3, 
  Database, 
  HardDrive, 
  RefreshCw, 
  Trash2,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react'

export function CacheAnalytics() {
  const { stats, isLoading, clearCache, refreshStats } = useCache()

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const hitRate = stats.hitRate || 0
  const totalRequests = stats.hits + stats.misses
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cache Analytics
              </CardTitle>
              <CardDescription>
                Monitor cache performance and storage usage
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshStats()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearCache()}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Hit Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Hit Rate</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold">
                  {(hitRate * 100).toFixed(1)}%
                </div>
                <Progress value={hitRate * 100} className="h-2" />
              </div>
            </div>

            {/* Total Requests */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {totalRequests.toLocaleString()}
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{stats.hits} hits</Badge>
                <Badge variant="outline">{stats.misses} misses</Badge>
              </div>
            </div>

            {/* Storage Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Storage</span>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{sizeInMB} MB</div>
              <div className="text-xs text-muted-foreground">
                {stats.entries} entries
              </div>
            </div>

            {/* Last Reset */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Reset</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm">
                {formatDistanceToNow(new Date(stats.lastReset), { addSuffix: true })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cache Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Hits</dt>
                <dd className="text-sm font-medium">{stats.hits.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Misses</dt>
                <dd className="text-sm font-medium">{stats.misses.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Stale Hits</dt>
                <dd className="text-sm font-medium">{stats.staleHits.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Errors</dt>
                <dd className="text-sm font-medium">{stats.errors.toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Storage Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Total Size</dt>
                <dd className="text-sm font-medium">{sizeInMB} MB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Entries</dt>
                <dd className="text-sm font-medium">{stats.entries}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Avg Entry Size</dt>
                <dd className="text-sm font-medium">
                  {stats.entries > 0 
                    ? ((stats.size / stats.entries) / 1024).toFixed(2) 
                    : '0'} KB
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Response Times */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Avg Response</dt>
                <dd className="text-sm font-medium">
                  {stats.avgResponseTime?.toFixed(0) || 'N/A'} ms
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-muted-foreground">Cache Benefit</dt>
                <dd className="text-sm font-medium">
                  {hitRate > 0 ? `~${(hitRate * 100).toFixed(0)}% faster` : 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
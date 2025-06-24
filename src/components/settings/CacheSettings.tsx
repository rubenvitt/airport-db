// Cache settings component for user control over caching behavior

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCache } from '@/hooks/useCache'
import { clearAllCaches } from '@/lib/cache'
import { 
  Database, 
  Trash2, 
  Download,
  Upload,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

export function CacheSettings() {
  const { stats, clearCache, prefetchData, warmupCache } = useCache()
  const [enableCache, setEnableCache] = useState(true)
  const [enablePersistence, setEnablePersistence] = useState(true)
  const [clearPattern, setClearPattern] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleClearCache = async () => {
    try {
      const cleared = await clearCache(clearPattern || undefined)
      setMessage({ 
        type: 'success', 
        text: `Successfully cleared ${cleared} cache entries` 
      })
      setClearPattern('')
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to clear cache' 
      })
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllCaches()
      setMessage({ 
        type: 'success', 
        text: 'All caches cleared successfully' 
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to clear all caches' 
      })
    }
  }

  const handlePrefetchCommon = async () => {
    try {
      // Prefetch common airport codes
      const commonAirports = ['LAX', 'JFK', 'ORD', 'ATL', 'DFW']
      const urls = commonAirports.map(code => 
        `/api/airports?iata=${code}`
      )
      await prefetchData(urls)
      setMessage({ 
        type: 'success', 
        text: 'Common airports prefetched successfully' 
      })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to prefetch data' 
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Cache Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Status
          </CardTitle>
          <CardDescription>
            Current cache usage and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Hit Rate</p>
                <p className="font-medium">{((stats.hitRate || 0) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Entries</p>
                <p className="font-medium">{stats.entries}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Storage Used</p>
                <p className="font-medium">{(stats.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Requests</p>
                <p className="font-medium">{stats.hits + stats.misses}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cache Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Settings</CardTitle>
          <CardDescription>
            Configure how data is cached in your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-cache">Enable Caching</Label>
              <p className="text-sm text-muted-foreground">
                Cache API responses for faster loading
              </p>
            </div>
            <Switch
              id="enable-cache"
              checked={enableCache}
              onCheckedChange={setEnableCache}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enable-persistence">Persistent Storage</Label>
              <p className="text-sm text-muted-foreground">
                Save cache data for offline access
              </p>
            </div>
            <Switch
              id="enable-persistence"
              checked={enablePersistence}
              onCheckedChange={setEnablePersistence}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Caching improves performance by storing frequently accessed data locally. 
              Persistent storage allows data to be available even after closing the browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Clear cache data or prefetch common resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="clear-pattern">Clear by Pattern (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="clear-pattern"
                placeholder="e.g., *airport* or v1:*/flights*"
                value={clearPattern}
                onChange={(e) => setClearPattern(e.target.value)}
              />
              <Button onClick={handleClearCache} variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use wildcards (*) to match multiple cache entries
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleClearAll} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Caches
            </Button>
            <Button onClick={handlePrefetchCommon} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Prefetch Common Airports
            </Button>
            <Button 
              onClick={() => warmupCache(['v1:/airports*'])} 
              variant="outline" 
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Warm Up Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
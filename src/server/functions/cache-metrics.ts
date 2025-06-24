// API endpoint for cache metrics and monitoring

import { json } from '@tanstack/start'
import { createAPIFileRoute } from '@tanstack/start/api'
import { getCache } from '@/lib/cache'
import { formatMetricsForPrometheus } from '@/lib/cache/observability'

export const metricsRoute = createAPIFileRoute('/api/cache/metrics')({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url)
      const format = url.searchParams.get('format') || 'json'
      
      const cache = await getCache()
      const stats = await cache.getStats()
      const metrics = await cache.getMetrics()
      
      // Return based on requested format
      switch (format) {
        case 'prometheus':
          return new Response(formatMetricsForPrometheus(metrics), {
            headers: {
              'Content-Type': 'text/plain; version=0.0.4',
            },
          })
          
        case 'json':
        default:
          return json({
            stats,
            metrics,
            timestamp: new Date().toISOString(),
          })
      }
    } catch (error) {
      console.error('Failed to get cache metrics:', error)
      return json(
        { error: 'Failed to retrieve cache metrics' },
        { status: 500 }
      )
    }
  },
})

export const statsRoute = createAPIFileRoute('/api/cache/stats')({
  GET: async () => {
    try {
      const cache = await getCache()
      const stats = await cache.getStats()
      
      return json({
        stats,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to get cache stats:', error)
      return json(
        { error: 'Failed to retrieve cache stats' },
        { status: 500 }
      )
    }
  },
  
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      
      if (body.action === 'reset') {
        const cache = await getCache()
        await cache.resetStats()
        
        return json({
          message: 'Cache stats reset successfully',
          timestamp: new Date().toISOString(),
        })
      }
      
      return json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    } catch (error) {
      console.error('Failed to reset cache stats:', error)
      return json(
        { error: 'Failed to reset cache stats' },
        { status: 500 }
      )
    }
  },
})
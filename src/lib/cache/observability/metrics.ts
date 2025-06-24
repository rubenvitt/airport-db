// Cache observability metrics implementation
// Provides performance tracking, monitoring, and structured logging

import type { CacheEvent, CacheEventType, CacheStats } from '../types'

export interface CacheMetrics {
  // Performance metrics
  hitRate: number
  missRate: number
  staleRate: number
  errorRate: number
  
  // Latency metrics (in ms)
  avgGetLatency: number
  avgSetLatency: number
  p95GetLatency: number
  p95SetLatency: number
  
  // Size metrics
  totalSize: number
  entryCount: number
  avgEntrySize: number
  
  // Operation counts
  totalGets: number
  totalSets: number
  totalDeletes: number
  totalErrors: number
  
  // Time-based metrics
  lastHour: {
    hits: number
    misses: number
    sets: number
    errors: number
  }
}

export interface LatencyTracker {
  record: (duration: number) => void
  getAverage: () => number
  getPercentile: (percentile: number) => number
  reset: () => void
}

export class SimpleLatencyTracker implements LatencyTracker {
  private samples: Array<number> = []
  private maxSamples = 1000
  
  record(duration: number): void {
    this.samples.push(duration)
    if (this.samples.length > this.maxSamples) {
      this.samples.shift()
    }
  }
  
  getAverage(): number {
    if (this.samples.length === 0) return 0
    const sum = this.samples.reduce((a, b) => a + b, 0)
    return sum / this.samples.length
  }
  
  getPercentile(percentile: number): number {
    if (this.samples.length === 0) return 0
    const sorted = [...this.samples].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
  
  reset(): void {
    this.samples = []
  }
}

export class CacheMetricsCollector {
  private stats: CacheStats
  private getLatency = new SimpleLatencyTracker()
  private setLatency = new SimpleLatencyTracker()
  private hourlyWindow: Array<{ timestamp: number; event: CacheEventType }> = []
  private readonly HOUR_IN_MS = 60 * 60 * 1000
  
  constructor(initialStats: CacheStats) {
    this.stats = initialStats
  }
  
  recordOperation(
    operation: 'get' | 'set',
    duration: number,
    success: boolean
  ): void {
    if (operation === 'get') {
      this.getLatency.record(duration)
    } else {
      this.setLatency.record(duration)
    }
    
    if (!success) {
      this.stats.errors++
    }
  }
  
  recordEvent(event: CacheEvent): void {
    const now = Date.now()
    
    // Update stats based on event type
    switch (event.type) {
      case 'hit':
        this.stats.hits++
        break
      case 'miss':
        this.stats.misses++
        break
      case 'stale-hit':
        this.stats.staleHits++
        break
      case 'error':
        this.stats.errors++
        break
    }
    
    // Record for hourly metrics
    this.hourlyWindow.push({
      timestamp: now,
      event: event.type
    })
    
    // Clean up old entries
    this.cleanupHourlyWindow(now)
  }
  
  getMetrics(): CacheMetrics {
    const totalOps = this.stats.hits + this.stats.misses
    const now = Date.now()
    
    this.cleanupHourlyWindow(now)
    
    const lastHour = this.calculateHourlyMetrics()
    
    return {
      // Performance metrics
      hitRate: totalOps > 0 ? this.stats.hits / totalOps : 0,
      missRate: totalOps > 0 ? this.stats.misses / totalOps : 0,
      staleRate: this.stats.hits > 0 ? this.stats.staleHits / this.stats.hits : 0,
      errorRate: totalOps > 0 ? this.stats.errors / totalOps : 0,
      
      // Latency metrics
      avgGetLatency: this.getLatency.getAverage(),
      avgSetLatency: this.setLatency.getAverage(),
      p95GetLatency: this.getLatency.getPercentile(95),
      p95SetLatency: this.setLatency.getPercentile(95),
      
      // Size metrics
      totalSize: this.stats.size,
      entryCount: this.stats.entries,
      avgEntrySize: this.stats.entries > 0 ? this.stats.size / this.stats.entries : 0,
      
      // Operation counts
      totalGets: this.stats.hits + this.stats.misses,
      totalSets: 0, // Would need to track this separately
      totalDeletes: 0, // Would need to track this separately
      totalErrors: this.stats.errors,
      
      // Time-based metrics
      lastHour
    }
  }
  
  updateStats(stats: Partial<CacheStats>): void {
    Object.assign(this.stats, stats)
  }
  
  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      staleHits: 0,
      errors: 0,
      size: 0,
      entries: 0,
      lastReset: Date.now()
    }
    this.getLatency.reset()
    this.setLatency.reset()
    this.hourlyWindow = []
  }
  
  private cleanupHourlyWindow(now: number): void {
    const hourAgo = now - this.HOUR_IN_MS
    this.hourlyWindow = this.hourlyWindow.filter(
      entry => entry.timestamp > hourAgo
    )
  }
  
  private calculateHourlyMetrics() {
    const counts = {
      hits: 0,
      misses: 0,
      sets: 0,
      errors: 0
    }
    
    for (const entry of this.hourlyWindow) {
      switch (entry.event) {
        case 'hit':
          counts.hits++
          break
        case 'miss':
          counts.misses++
          break
        case 'set':
          counts.sets++
          break
        case 'error':
          counts.errors++
          break
      }
    }
    
    return counts
  }
}

// Prometheus-style metrics formatter
export function formatMetricsForPrometheus(
  metrics: CacheMetrics,
  prefix = 'cache'
): string {
  const lines: Array<string> = [
    `# HELP ${prefix}_hit_rate Cache hit rate (0-1)`,
    `# TYPE ${prefix}_hit_rate gauge`,
    `${prefix}_hit_rate ${metrics.hitRate.toFixed(4)}`,
    
    `# HELP ${prefix}_miss_rate Cache miss rate (0-1)`,
    `# TYPE ${prefix}_miss_rate gauge`,
    `${prefix}_miss_rate ${metrics.missRate.toFixed(4)}`,
    
    `# HELP ${prefix}_error_rate Cache error rate (0-1)`,
    `# TYPE ${prefix}_error_rate gauge`,
    `${prefix}_error_rate ${metrics.errorRate.toFixed(4)}`,
    
    `# HELP ${prefix}_get_latency_avg Average GET latency in milliseconds`,
    `# TYPE ${prefix}_get_latency_avg gauge`,
    `${prefix}_get_latency_avg ${metrics.avgGetLatency.toFixed(2)}`,
    
    `# HELP ${prefix}_get_latency_p95 95th percentile GET latency in milliseconds`,
    `# TYPE ${prefix}_get_latency_p95 gauge`,
    `${prefix}_get_latency_p95 ${metrics.p95GetLatency.toFixed(2)}`,
    
    `# HELP ${prefix}_size_bytes Total cache size in bytes`,
    `# TYPE ${prefix}_size_bytes gauge`,
    `${prefix}_size_bytes ${metrics.totalSize}`,
    
    `# HELP ${prefix}_entries Total number of cache entries`,
    `# TYPE ${prefix}_entries gauge`,
    `${prefix}_entries ${metrics.entryCount}`,
    
    `# HELP ${prefix}_operations_total Total cache operations by type`,
    `# TYPE ${prefix}_operations_total counter`,
    `${prefix}_operations_total{type="get"} ${metrics.totalGets}`,
    `${prefix}_operations_total{type="error"} ${metrics.totalErrors}`,
  ]
  
  return lines.join('\n')
}
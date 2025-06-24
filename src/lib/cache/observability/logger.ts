// Structured logging for cache operations
// Provides consistent, queryable logs with correlation IDs

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  correlationId?: string
  userId?: string
  sessionId?: string
  requestId?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  module: string
  operation?: string
  duration?: number
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, any>
}

export interface Logger {
  debug: (message: string, metadata?: Record<string, any>) => void
  info: (message: string, metadata?: Record<string, any>) => void
  warn: (message: string, metadata?: Record<string, any>) => void
  error: (message: string, error?: Error, metadata?: Record<string, any>) => void
  child: (context: LogContext) => Logger
}

export class StructuredLogger implements Logger {
  private context: LogContext
  private module: string
  private transport: (entry: LogEntry) => void
  
  constructor(
    module: string,
    context: LogContext = {},
    transport?: (entry: LogEntry) => void
  ) {
    this.module = module
    this.context = context
    this.transport = transport || this.defaultTransport
  }
  
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }
  
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }
  
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }
  
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined
    
    this.log('error', message, metadata, errorInfo)
  }
  
  child(context: LogContext): Logger {
    return new StructuredLogger(
      this.module,
      { ...this.context, ...context },
      this.transport
    )
  }
  
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: LogEntry['error']
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.module,
      context: this.context,
      metadata,
      error
    }
    
    this.transport(entry)
  }
  
  private defaultTransport(entry: LogEntry): void {
    const { level, message, ...rest } = entry
    
    // Format for console output
    const prefix = `[${entry.timestamp}] [${entry.module}] ${level.toUpperCase()}`
    const contextStr = entry.context?.correlationId 
      ? ` [${entry.context.correlationId}]` 
      : ''
    
    switch (level) {
      case 'debug':
        console.debug(`${prefix}${contextStr}:`, message, rest)
        break
      case 'info':
        console.info(`${prefix}${contextStr}:`, message, rest)
        break
      case 'warn':
        console.warn(`${prefix}${contextStr}:`, message, rest)
        break
      case 'error':
        console.error(`${prefix}${contextStr}:`, message, rest)
        break
    }
  }
}

// Cache-specific logger with operation tracking
export class CacheLogger extends StructuredLogger {
  constructor(context: LogContext = {}, transport?: (entry: LogEntry) => void) {
    super('cache', context, transport)
  }
  
  logOperation(
    operation: string,
    key: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const level = success ? 'debug' : 'warn'
    const message = `Cache ${operation} for key: ${key}`
    
    this.log(level, message, {
      ...metadata,
      operation,
      key,
      duration,
      success
    })
  }
  
  logCacheHit(key: string, metadata?: Record<string, any>): void {
    this.debug('Cache hit', {
      ...metadata,
      operation: 'get',
      key,
      result: 'hit'
    })
  }
  
  logCacheMiss(key: string, metadata?: Record<string, any>): void {
    this.debug('Cache miss', {
      ...metadata,
      operation: 'get',
      key,
      result: 'miss'
    })
  }
  
  logCacheSet(key: string, ttl: number, size: number, metadata?: Record<string, any>): void {
    this.debug('Cache set', {
      ...metadata,
      operation: 'set',
      key,
      ttl,
      size
    })
  }
  
  logCacheError(
    operation: string,
    key: string,
    error: Error,
    metadata?: Record<string, any>
  ): void {
    this.error(`Cache ${operation} failed for key: ${key}`, error, {
      ...metadata,
      operation,
      key
    })
  }
  
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: LogEntry['error']
  ): void {
    // Override to add operation tracking
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module: 'cache',
      operation: metadata?.operation,
      duration: metadata?.duration,
      context: this.context,
      metadata,
      error
    }
    
    // Call parent transport
    ;(this as any).transport(entry)
  }
}

// JSON formatter for production logging
export function jsonTransport(entry: LogEntry): void {
  console.log(JSON.stringify(entry))
}

// Pretty formatter for development
export function prettyTransport(entry: LogEntry): void {
  const { level, message, module, operation, duration, context, metadata, error } = entry
  
  const parts = [
    `[${entry.timestamp}]`,
    `[${module}]`,
    level.toUpperCase().padEnd(5)
  ]
  
  if (context?.correlationId) {
    parts.push(`[${context.correlationId.substring(0, 8)}]`)
  }
  
  if (operation) {
    parts.push(`[${operation}]`)
  }
  
  parts.push(message)
  
  if (duration !== undefined) {
    parts.push(`(${duration}ms)`)
  }
  
  const logMessage = parts.join(' ')
  
  // Log based on level
  switch (level) {
    case 'debug':
      console.debug(logMessage, metadata || '')
      break
    case 'info':
      console.info(logMessage, metadata || '')
      break
    case 'warn':
      console.warn(logMessage, metadata || '')
      if (error) console.warn(error)
      break
    case 'error':
      console.error(logMessage, metadata || '')
      if (error) console.error(error)
      break
  }
}

// Helper to generate correlation IDs
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
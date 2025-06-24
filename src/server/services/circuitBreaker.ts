// Circuit breaker pattern implementation for resilient service calls

import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'

const logger = new StructuredLogger(
  'circuit-breaker',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  name: string
  failureThreshold?: number
  resetTimeout?: number
  monitoringPeriod?: number
  halfOpenRequests?: number
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void
}

export class CircuitBreaker {
  private name: string
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private successCount = 0
  private lastFailureTime?: number
  private halfOpenRequestCount = 0
  
  // Configuration
  private failureThreshold: number
  private resetTimeout: number
  private monitoringPeriod: number
  private halfOpenRequests: number
  private onStateChange?: (oldState: CircuitState, newState: CircuitState) => void

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name
    this.failureThreshold = options.failureThreshold || 5
    this.resetTimeout = options.resetTimeout || 60000 // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000 // 10 seconds
    this.halfOpenRequests = options.halfOpenRequests || 3
    this.onStateChange = options.onStateChange
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionTo(CircuitState.HALF_OPEN)
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`)
      }
    }

    // In HALF_OPEN state, limit the number of requests
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequestCount >= this.halfOpenRequests) {
        throw new Error(`Circuit breaker ${this.name} is HALF_OPEN and at request limit`)
      }
      this.halfOpenRequestCount++
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.successCount++

    if (this.state === CircuitState.HALF_OPEN) {
      // If all half-open requests succeed, close the circuit
      if (this.successCount >= this.halfOpenRequests) {
        this.transitionTo(CircuitState.CLOSED)
      }
    }

    logger.debug('Circuit breaker request succeeded', {
      name: this.name,
      state: this.state,
      successCount: this.successCount
    })
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    this.successCount = 0

    logger.warn('Circuit breaker request failed', {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.failureThreshold
    })

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN state reopens the circuit
      this.transitionTo(CircuitState.OPEN)
    } else if (this.state === CircuitState.CLOSED && this.failureCount >= this.failureThreshold) {
      // Too many failures in CLOSED state opens the circuit
      this.transitionTo(CircuitState.OPEN)
    }
  }

  private shouldTransitionToHalfOpen(): boolean {
    if (!this.lastFailureTime) return false
    return Date.now() - this.lastFailureTime >= this.resetTimeout
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state
    this.state = newState

    // Reset counters on state transition
    if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenRequestCount = 0
      this.successCount = 0
    } else if (newState === CircuitState.CLOSED) {
      this.failureCount = 0
      this.successCount = 0
      this.halfOpenRequestCount = 0
    }

    logger.info('Circuit breaker state changed', {
      name: this.name,
      oldState,
      newState
    })

    if (this.onStateChange) {
      this.onStateChange(oldState, newState)
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenRequestCount: this.halfOpenRequestCount
    }
  }

  reset(): void {
    this.transitionTo(CircuitState.CLOSED)
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = undefined
    this.halfOpenRequestCount = 0
  }
}

// Exponential backoff helper
export class ExponentialBackoff {
  private attempt = 0
  private baseDelay: number
  private maxDelay: number
  private maxAttempts: number

  constructor(
    baseDelay = 1000,
    maxDelay = 30000,
    maxAttempts = 5
  ) {
    this.baseDelay = baseDelay
    this.maxDelay = maxDelay
    this.maxAttempts = maxAttempts
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown = new Error('No attempts made')
    
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      try {
        const result = await fn()
        this.reset()
        return result
      } catch (error) {
        lastError = error
        this.attempt = attempt + 1
        
        if (this.attempt >= this.maxAttempts) {
          logger.error('Max retry attempts reached', {
            attempts: this.attempt,
            maxAttempts: this.maxAttempts
          })
          throw error
        }

        const delay = this.getDelay()
        logger.warn('Retrying after backoff', {
          attempt: this.attempt,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        await this.sleep(delay)
      }
    }

    throw lastError
  }

  private getDelay(): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt - 1),
      this.maxDelay
    )
    
    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25
    return Math.floor(exponentialDelay + (Math.random() * 2 - 1) * jitter)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  reset(): void {
    this.attempt = 0
  }
}
// Security utilities for the frontend application

/**
 * Sanitize user input to prevent XSS attacks
 * Removes any HTML tags and dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate URL to ensure it's safe to use
 * Only allows HTTP(S) and relative URLs
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    // If it fails to parse, check if it's a relative URL
    return url.startsWith('/') && !url.startsWith('//')
  }
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char)
}

/**
 * Generate a nonce for inline scripts (if needed)
 */
export function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
}

/**
 * Check if the current connection is secure (HTTPS)
 */
export function isSecureConnection(): boolean {
  return window.location.protocol === 'https:'
}

/**
 * Warn user if using insecure connection
 */
export function checkSecureConnection(): void {
  if (!isSecureConnection() && process.env.NODE_ENV === 'production') {
    console.warn(
      'Warning: This application should be served over HTTPS in production for security reasons.'
    )
  }
}

/**
 * Validate API key format (basic check)
 */
export function isValidApiKey(key: string): boolean {
  // Basic validation - adjust based on your API key format
  return key.length > 10 && /^[\w-]+$/.test(key)
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private requests: Array<number> = []
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  canMakeRequest(): boolean {
    const now = Date.now()
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now)
      return true
    }
    
    return false
  }
  
  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    return Math.max(0, this.maxRequests - this.requests.length)
  }
  
  getResetTime(): number {
    if (this.requests.length === 0) return 0
    const oldestRequest = Math.min(...this.requests)
    return oldestRequest + this.windowMs
  }
}
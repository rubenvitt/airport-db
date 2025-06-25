// OpenSky OAuth2 Token Management Service
// Handles token fetching, caching, and refresh for the OpenSky Network API

import { getRedisClient } from './redisClient'
import { concurrencyManager } from './concurrencyManager'

// Token cache configuration
const TOKEN_CACHE_KEY = 'opensky:oauth:token'
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000 // Refresh 5 minutes before expiry
const TOKEN_LOCK_TTL = 30 // Lock for 30 seconds during token fetch

// OAuth2 configuration from environment
const OPENSKY_CLIENT_ID = process.env.VITE_OPENSKY_CLIENT_ID
const OPENSKY_CLIENT_SECRET = process.env.VITE_OPENSKY_CLIENT_SECRET
const OPENSKY_AUTH_URL = process.env.VITE_OPENSKY_AUTH_URL || 
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'

// Legacy Basic Auth fallback
const OPENSKY_USERNAME = process.env.VITE_OPENSKY_USERNAME
const OPENSKY_PASSWORD = process.env.VITE_OPENSKY_PASSWORD

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
}

interface CachedToken {
  token: string
  expiresAt: number
  tokenType: string
}

class OpenSkyAuthService {
  private memoryCache: CachedToken | null = null

  /**
   * Check if OAuth2 credentials are configured
   */
  hasOAuth2Credentials(): boolean {
    return !!(OPENSKY_CLIENT_ID && OPENSKY_CLIENT_SECRET)
  }

  /**
   * Check if legacy Basic Auth credentials are configured
   */
  hasBasicAuthCredentials(): boolean {
    return !!(OPENSKY_USERNAME && OPENSKY_PASSWORD)
  }

  /**
   * Get authorization headers for API requests
   * Automatically handles OAuth2 or falls back to Basic Auth
   */
  async getAuthHeaders(): Promise<HeadersInit> {
    // Try OAuth2 first
    if (this.hasOAuth2Credentials()) {
      try {
        const token = await this.getValidToken()
        return { Authorization: `Bearer ${token}` }
      } catch (error) {
        console.error('Failed to get OAuth2 token:', error)
        // Fall through to Basic Auth if available
      }
    }

    // Fall back to Basic Auth if available
    if (this.hasBasicAuthCredentials()) {
      const auth = Buffer.from(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`).toString('base64')
      return { Authorization: `Basic ${auth}` }
    }

    // No authentication available
    return {}
  }

  /**
   * Get a valid OAuth2 token, fetching a new one if necessary
   */
  private async getValidToken(): Promise<string> {
    // Check memory cache first
    if (this.memoryCache && this.memoryCache.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER) {
      return this.memoryCache.token
    }

    // Check Redis cache
    const redis = await getRedisClient()
    if (redis) {
      try {
        const cached = await redis.get(TOKEN_CACHE_KEY)
        if (cached) {
          const tokenData = JSON.parse(cached) as CachedToken
          if (tokenData.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER) {
            this.memoryCache = tokenData
            return tokenData.token
          }
        }
      } catch (error) {
        console.error('Error reading token from cache:', error)
      }
    }

    // Fetch a new token with deduplication to prevent concurrent requests
    const result = await concurrencyManager.deduplicateOperation(
      TOKEN_CACHE_KEY,
      async () => this.fetchNewToken(),
      { ttl: TOKEN_LOCK_TTL }
    )

    return result
  }

  /**
   * Fetch a new OAuth2 token from OpenSky
   */
  private async fetchNewToken(): Promise<string> {
    if (!this.hasOAuth2Credentials()) {
      throw new Error('OAuth2 credentials not configured')
    }

    try {
      // Prepare form data for token request
      const formData = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: OPENSKY_CLIENT_ID!,
        client_secret: OPENSKY_CLIENT_SECRET!,
      })

      // Make token request
      const response = await fetch(OPENSKY_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Token request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const tokenResponse: TokenResponse = await response.json()

      // Calculate expiration time (convert seconds to milliseconds)
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)

      // Create cached token object
      const cachedToken: CachedToken = {
        token: tokenResponse.access_token,
        expiresAt,
        tokenType: tokenResponse.token_type,
      }

      // Store in memory cache
      this.memoryCache = cachedToken

      // Store in Redis cache if available
      const redis = await getRedisClient()
      if (redis) {
        try {
          // Set TTL slightly less than actual expiry to ensure we refresh in time
          const ttl = Math.floor((tokenResponse.expires_in - 60)) // 1 minute buffer
          await redis.setex(TOKEN_CACHE_KEY, ttl, JSON.stringify(cachedToken))
        } catch (error) {
          console.error('Error caching token in Redis:', error)
          // Continue even if Redis fails
        }
      }

      console.log(`OpenSky OAuth2 token obtained, expires in ${tokenResponse.expires_in} seconds`)
      return cachedToken.token

    } catch (error) {
      console.error('Failed to fetch OpenSky OAuth2 token:', error)
      throw error
    }
  }

  /**
   * Clear cached tokens (useful for testing or forced refresh)
   */
  async clearTokenCache(): Promise<void> {
    this.memoryCache = null
    
    const redis = await getRedisClient()
    if (redis) {
      try {
        await redis.del(TOKEN_CACHE_KEY)
      } catch (error) {
        console.error('Error clearing token cache:', error)
      }
    }
  }

  /**
   * Get authentication type being used
   */
  getAuthType(): 'oauth2' | 'basic' | 'none' {
    if (this.hasOAuth2Credentials()) return 'oauth2'
    if (this.hasBasicAuthCredentials()) return 'basic'
    return 'none'
  }
}

// Export singleton instance
export const openskyAuth = new OpenSkyAuthService()
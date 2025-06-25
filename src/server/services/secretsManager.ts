// Secrets Manager for Redis and other sensitive credentials
// Supports multiple secret sources: environment variables, files, and external services

import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import { StructuredLogger, jsonTransport, prettyTransport } from '../../lib/cache/observability'

const logger = new StructuredLogger(
  'secrets-manager',
  {},
  process.env.NODE_ENV === 'production' ? jsonTransport : prettyTransport
)

export interface SecretConfig {
  source: 'env' | 'file' | 'vault' | 'aws-secrets-manager' | 'gcp-secret-manager'
  path?: string
  key?: string
  encoding?: BufferEncoding
  decrypt?: boolean
}

export interface Secrets {
  redisPassword?: string
  redisUsername?: string
  redisTlsCa?: string
  redisTlsCert?: string
  redisTlsKey?: string
  apiNinjasKey?: string
  openSkyUsername?: string
  openSkyPassword?: string
}

class SecretsManager {
  private cache: Map<string, string> = new Map()
  private secretsPath: string
  private encryptionKey?: Buffer

  constructor() {
    this.secretsPath = process.env.SECRETS_PATH || path.join(process.cwd(), '.secrets')
    
    // Initialize encryption key from environment or generate one
    if (process.env.SECRETS_ENCRYPTION_KEY) {
      this.encryptionKey = Buffer.from(process.env.SECRETS_ENCRYPTION_KEY, 'hex')
    }
  }

  async initialize(): Promise<void> {
    // Create secrets directory if it doesn't exist
    try {
      await fs.mkdir(this.secretsPath, { recursive: true, mode: 0o700 })
    } catch (error) {
      logger.error('Failed to create secrets directory', error as Error)
    }
  }

  // Get secret from various sources
  async getSecret(name: string, config: SecretConfig): Promise<string | undefined> {
    const cacheKey = `${config.source}:${name}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    let secret: string | undefined

    switch (config.source) {
      case 'env':
        secret = process.env[config.key || name]
        break

      case 'file':
        secret = await this.readSecretFromFile(config.path || name)
        break

      case 'vault':
        secret = await this.readFromHashicorpVault(name, config)
        break

      case 'aws-secrets-manager':
        secret = await this.readFromAWSSecretsManager(name, config)
        break

      case 'gcp-secret-manager':
        secret = await this.readFromGCPSecretManager(name, config)
        break
    }

    // Decrypt if needed
    if (secret && config.decrypt && this.encryptionKey) {
      secret = this.decrypt(secret)
    }

    // Cache the secret
    if (secret) {
      this.cache.set(cacheKey, secret)
    }

    return secret
  }

  // Read secret from file
  private async readSecretFromFile(filename: string): Promise<string | undefined> {
    try {
      const filePath = path.isAbsolute(filename) 
        ? filename 
        : path.join(this.secretsPath, filename)
      
      const content = await fs.readFile(filePath, 'utf8')
      return content.trim()
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        logger.error(`Failed to read secret from file: ${filename}`, error as Error)
      }
      return undefined
    }
  }

  // Placeholder for HashiCorp Vault integration
  private async readFromHashicorpVault(name: string, config: SecretConfig): Promise<string | undefined> {
    // Implementation would require vault client library
    logger.warn('HashiCorp Vault integration not implemented', { name })
    return undefined
  }

  // Placeholder for AWS Secrets Manager integration
  private async readFromAWSSecretsManager(name: string, config: SecretConfig): Promise<string | undefined> {
    // Implementation would require AWS SDK
    logger.warn('AWS Secrets Manager integration not implemented', { name })
    return undefined
  }

  // Placeholder for GCP Secret Manager integration
  private async readFromGCPSecretManager(name: string, config: SecretConfig): Promise<string | undefined> {
    // Implementation would require GCP client library
    logger.warn('GCP Secret Manager integration not implemented', { name })
    return undefined
  }

  // Get all secrets with fallback to environment variables
  async getAllSecrets(): Promise<Secrets> {
    const secrets: Secrets = {}

    // Redis credentials
    secrets.redisPassword = await this.getSecret('REDIS_PASSWORD', {
      source: process.env.SECRETS_SOURCE as any || 'env',
      key: 'REDIS_PASSWORD'
    }) || process.env.REDIS_PASSWORD

    secrets.redisUsername = await this.getSecret('REDIS_USERNAME', {
      source: process.env.SECRETS_SOURCE as any || 'env',
      key: 'REDIS_USERNAME'
    }) || process.env.REDIS_USERNAME || 'airport-app'

    // TLS certificates
    if (process.env.REDIS_TLS_ENABLED === 'true') {
      secrets.redisTlsCa = await this.getSecret('REDIS_TLS_CA', {
        source: 'file',
        path: process.env.REDIS_TLS_CA || 'redis/tls/ca.crt'
      })

      secrets.redisTlsCert = await this.getSecret('REDIS_TLS_CERT', {
        source: 'file',
        path: process.env.REDIS_TLS_CERT || 'redis/tls/client.crt'
      })

      secrets.redisTlsKey = await this.getSecret('REDIS_TLS_KEY', {
        source: 'file',
        path: process.env.REDIS_TLS_KEY || 'redis/tls/client.key'
      })
    }

    // API keys
    secrets.apiNinjasKey = await this.getSecret('VITE_API_NINJAS_API_KEY', {
      source: process.env.SECRETS_SOURCE as any || 'env',
      key: 'VITE_API_NINJAS_API_KEY'
    })

    secrets.openSkyUsername = await this.getSecret('VITE_OPENSKY_USERNAME', {
      source: process.env.SECRETS_SOURCE as any || 'env',
      key: 'VITE_OPENSKY_USERNAME'
    })

    secrets.openSkyPassword = await this.getSecret('VITE_OPENSKY_PASSWORD', {
      source: process.env.SECRETS_SOURCE as any || 'env',
      key: 'VITE_OPENSKY_PASSWORD'
    })

    return secrets
  }

  // Generate secure random password
  generatePassword(length: number = 32): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-='
    const randomBytes = crypto.randomBytes(length)
    let password = ''
    
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length]
    }
    
    return password
  }

  // Save secret to file (for development/setup)
  async saveSecret(name: string, value: string, encrypt: boolean = false): Promise<void> {
    const filePath = path.join(this.secretsPath, name)
    
    let content = value
    if (encrypt && this.encryptionKey) {
      content = this.encrypt(value)
    }

    await fs.writeFile(filePath, content, { mode: 0o600 })
    logger.info(`Secret saved: ${name}`)
  }

  // Simple encryption for at-rest protection
  private encrypt(text: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
  }

  // Decrypt encrypted secrets
  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured')
    }

    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // Clear cached secrets
  clearCache(): void {
    this.cache.clear()
    logger.info('Secrets cache cleared')
  }

  // Rotate encryption key
  async rotateEncryptionKey(newKey: Buffer): Promise<void> {
    const oldKey = this.encryptionKey
    this.encryptionKey = newKey

    // Re-encrypt all file-based secrets
    const files = await fs.readdir(this.secretsPath)
    
    for (const file of files) {
      if (file.startsWith('.')) continue
      
      try {
        const filePath = path.join(this.secretsPath, file)
        const content = await fs.readFile(filePath, 'utf8')
        
        // Try to decrypt with old key
        if (oldKey) {
          this.encryptionKey = oldKey
          const decrypted = this.decrypt(content)
          
          // Re-encrypt with new key
          this.encryptionKey = newKey
          const encrypted = this.encrypt(decrypted)
          
          await fs.writeFile(filePath, encrypted, { mode: 0o600 })
        }
      } catch (error) {
        logger.error(`Failed to rotate key for ${file}`, error as Error)
      }
    }

    logger.info('Encryption key rotated successfully')
  }
}

// Export singleton instance
export const secretsManager = new SecretsManager()
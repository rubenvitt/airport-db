# Redis Security Configuration Guide

This document outlines the security measures implemented for the Redis cache layer in the Airport Database application.

## Table of Contents

1. [Overview](#overview)
2. [Authentication and ACLs](#authentication-and-acls)
3. [TLS/SSL Encryption](#tlsssl-encryption)
4. [Secrets Management](#secrets-management)
5. [Rate Limiting](#rate-limiting)
6. [Network Isolation](#network-isolation)
7. [Security Best Practices](#security-best-practices)
8. [Monitoring and Auditing](#monitoring-and-auditing)

## Overview

The Redis cache layer implements multiple security measures to protect airport data and prevent unauthorized access:

- **Authentication**: ACL-based user authentication with strong passwords
- **Encryption**: TLS/SSL support for data in transit
- **Secrets Management**: Secure storage and rotation of credentials
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Network Isolation**: Restricted access and network segmentation
- **Monitoring**: Comprehensive logging and alerting

## Authentication and ACLs

### ACL Configuration

Redis ACLs (Access Control Lists) are configured to provide fine-grained access control:

```bash
# Users defined in redis/users.acl:
- default: Disabled for security
- airport-app: Application user with restricted permissions
- monitoring: Read-only user for health checks
- admin: Full access (use sparingly)
- backup: Replication/backup operations
```

### Setting Up Authentication

1. Generate secure passwords:
   ```bash
   ./scripts/setup-redis-security.sh
   ```

2. The script will:
   - Generate cryptographically secure passwords
   - Update Redis configuration files
   - Create `.env.local` with credentials
   - Store passwords in `.secrets/` directory

### ACL Permissions

The `airport-app` user has these permissions:
- Can access only `airport:*` and `airport:stats` keys
- Can perform read/write operations on strings and hashes
- Cannot execute dangerous commands (FLUSHDB, CONFIG, etc.)

## TLS/SSL Encryption

### Generating Certificates

1. Run the TLS generation script:
   ```bash
   ./scripts/generate-redis-tls.sh
   ```

2. This creates:
   - Certificate Authority (CA)
   - Server certificate and key
   - Client certificate and key
   - Diffie-Hellman parameters

### Configuring TLS

1. Enable TLS in `.env.local`:
   ```env
   REDIS_TLS_ENABLED=true
   REDIS_TLS_CA=./redis/tls/ca.crt
   REDIS_TLS_CERT=./redis/tls/client.crt
   REDIS_TLS_KEY=./redis/tls/client.key
   REDIS_TLS_SERVERNAME=redis-server
   ```

2. Start Redis with TLS:
   ```bash
   docker-compose -f docker-compose.secure.yml up -d
   ```

### TLS Best Practices

- Use TLS 1.2 or higher
- Strong cipher suites only
- Regular certificate rotation
- Proper certificate validation

## Secrets Management

### Secrets Storage

The application supports multiple secret sources:

1. **Environment Variables** (default for development)
2. **File-based Secrets** (recommended for production)
3. **HashiCorp Vault** (enterprise)
4. **AWS Secrets Manager** (cloud)
5. **GCP Secret Manager** (cloud)

### Configuration

```env
# In .env.local
SECRETS_SOURCE=file
SECRETS_PATH=.secrets
SECRETS_ENCRYPTION_KEY=<32-byte-hex-key>
```

### Secrets Rotation

To rotate secrets:

1. Generate new passwords:
   ```bash
   node -e "console.log(require('./src/server/services/secretsManager').secretsManager.generatePassword(32))"
   ```

2. Update ACL file and restart Redis:
   ```bash
   redis-cli ACL SETUSER airport-app on ><new-password>
   ```

3. Update application secrets
4. Restart application

## Rate Limiting

### Implementation

Rate limiting is implemented at multiple levels:

1. **Server Function Level**: Using `withRateLimit` wrapper
2. **Endpoint Specific**: Different limits for different operations
3. **API Key Based**: Higher limits for authenticated requests

### Configuration

```typescript
// Rate limit configurations
export const rateLimitConfigs = {
  general: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 100,
  },
  airportLookup: {
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 30,           // 30 requests per minute
  },
  flightData: {
    windowMs: 1 * 60 * 1000,   // 1 minute
    maxRequests: 20,           // 20 requests per minute
  },
}
```

### Usage

```typescript
// Apply rate limiting to server functions
export const getAirportByIATA = withRateLimit(
  getAirportByIATABase,
  'airportLookup'
)
```

## Network Isolation

### Docker Network Configuration

```yaml
# docker-compose.secure.yml
services:
  redis-secure:
    ports:
      - "127.0.0.1:9021:6379"  # Only bind to localhost
    networks:
      - redis-network
    security_opt:
      - no-new-privileges:true
    read_only: true

networks:
  redis-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Firewall Rules

Recommended firewall configuration:

```bash
# Allow only application server to connect to Redis
iptables -A INPUT -p tcp --dport 6379 -s <app-server-ip> -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Security Best Practices

### 1. Principle of Least Privilege

- Each service has its own Redis user
- Minimal permissions granted
- Regular permission audits

### 2. Defense in Depth

- Multiple layers of security
- Fallback mechanisms
- Circuit breakers for resilience

### 3. Regular Updates

- Keep Redis updated
- Update dependencies
- Patch security vulnerabilities

### 4. Secure Configuration

```conf
# redis.conf security settings
protected-mode yes
bind 127.0.0.1 ::1
requirepass <strong-password>
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
```

### 5. Data Protection

- No PII in cache
- Automatic expiration (TTL)
- Encrypted backups

## Monitoring and Auditing

### Logging

All security events are logged:

```typescript
logger.warn('Rate limit exceeded', {
  function: fn.name,
  key,
  count,
  limit: config.maxRequests
})
```

### Metrics

Monitor these security metrics:

1. **Authentication Failures**: Track failed login attempts
2. **Rate Limit Violations**: Monitor abuse patterns
3. **Circuit Breaker Trips**: Identify service issues
4. **TLS Handshake Failures**: Detect certificate issues

### Alerts

Set up alerts for:

- Multiple authentication failures
- Unusual access patterns
- Circuit breaker state changes
- Certificate expiration

### Security Testing

Run security tests regularly:

```bash
npm test -- redis-security.test.ts
```

## Incident Response

### If Compromised

1. **Immediate Actions**:
   - Rotate all passwords
   - Review access logs
   - Check for data exfiltration

2. **Investigation**:
   - Analyze Redis logs
   - Review application logs
   - Check network traffic

3. **Remediation**:
   - Patch vulnerabilities
   - Update security rules
   - Enhance monitoring

### Regular Security Audits

1. **Weekly**:
   - Review access logs
   - Check rate limit violations

2. **Monthly**:
   - Rotate passwords
   - Update ACLs
   - Review security metrics

3. **Quarterly**:
   - Security scan
   - Penetration testing
   - Update documentation

## Compliance

This configuration helps meet common security requirements:

- **OWASP**: Implements recommended security controls
- **PCI DSS**: Encryption and access controls
- **SOC 2**: Audit trails and monitoring
- **GDPR**: Data protection and access controls

## Support

For security issues or questions:

1. Check logs in `redis/logs/`
2. Review metrics in monitoring dashboard
3. Contact security team for incidents
4. File security bugs privately

Remember: Security is everyone's responsibility. Report any suspicious activity immediately.
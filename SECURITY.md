# Security Implementation

This document outlines the security measures implemented in the Airport Database application.

## 1. Input Sanitization

All user inputs are sanitized to prevent XSS attacks:
- HTML tags are stripped
- JavaScript protocols are removed
- Event handlers are filtered out

See: `src/utils/security.ts` - `sanitizeInput()` function

## 2. Content Security Policy (CSP)

Development and production CSP headers are configured to prevent:
- Inline script execution
- Unauthorized resource loading
- Clickjacking attacks

See: `vite.config.ts` and `src/utils/security-headers.ts`

## 3. API Security

### Rate Limiting
Client-side rate limiting is implemented for all API calls:
- API Ninjas: 10 requests per minute
- OpenSky Network: 5 requests per minute (anonymous)

See: `src/utils/security.ts` - `RateLimiter` class

### API Key Protection
- API keys are stored in environment variables
- Never exposed in client-side code
- Validated on application startup

See: `src/api/config.ts` and `.env.example`

## 4. Security Headers

The following security headers are configured:
- `X-Content-Type-Options: nosniff` - Prevent MIME type sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - Enable XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer info
- `Permissions-Policy` - Disable unnecessary browser features
- `Strict-Transport-Security` - Enforce HTTPS (production only)

## 5. HTTPS Enforcement

The application checks for secure connections in production and warns users if accessed over HTTP.

See: `src/utils/security-init.ts`

## 6. Additional Protections

- Clickjacking protection (iframe detection)
- URL validation for external links
- HTML entity escaping utilities
- Secure connection validation

## Production Deployment

When deploying to production:

1. **Use HTTPS only** - Configure SSL/TLS certificates
2. **Set security headers** - Use the provided Nginx/Apache configurations
3. **Environment variables** - Never commit API keys
4. **CSP adjustments** - Remove 'unsafe-inline' from production CSP
5. **Rate limiting** - Consider server-side rate limiting
6. **Web Application Firewall** - Use a WAF for additional protection

## Security Testing

Regular security audits should include:
- Dependency vulnerability scanning (`npm audit`)
- CSP violation monitoring
- Rate limit testing
- Input validation testing
- HTTPS configuration testing

## Reporting Security Issues

If you discover a security vulnerability, please report it to the maintainers privately.
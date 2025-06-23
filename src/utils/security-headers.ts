// Security headers configuration for production
// These should be set by your web server or CDN

export const securityHeaders = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Enable XSS filter (legacy, but still useful)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy - strict for production
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://opensky-network.org https://api.api-ninjas.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; '),
  
  // Feature permissions
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),
  
  // Cross-domain policies
  'X-Permitted-Cross-Domain-Policies': 'none',
  
  // HSTS - enforce HTTPS (only set this in production with HTTPS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

/**
 * Example Nginx configuration:
 * 
 * add_header X-Content-Type-Options "nosniff" always;
 * add_header X-Frame-Options "DENY" always;
 * add_header X-XSS-Protection "1; mode=block" always;
 * add_header Referrer-Policy "strict-origin-when-cross-origin" always;
 * add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://opensky-network.org https://api.api-ninjas.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
 * add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" always;
 * add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
 * 
 * Example Apache .htaccess:
 * 
 * Header always set X-Content-Type-Options "nosniff"
 * Header always set X-Frame-Options "DENY"
 * Header always set X-XSS-Protection "1; mode=block"
 * Header always set Referrer-Policy "strict-origin-when-cross-origin"
 * Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://opensky-network.org https://api.api-ninjas.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
 * Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
 * Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  plugins: [
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    // Use standard React plugin instead of TanStack Start
    react(),
    // Proxy to Express server for API routes
    {
      name: 'express-proxy',
      configureServer(server) {
        server.middlewares.use('/api', (req, res, next) => {
          // Proxy API requests to Express server running on port 3001
          const url = `http://localhost:3001${req.url}`
          
          console.log(`Proxying ${req.method} ${req.url} to Express server`)
          
          fetch(url, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
          })
          .then(async response => {
            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              res.setHeader(key, value)
            })
            const data = await response.text()
            res.end(data)
          })
          .catch(error => {
            console.error('Proxy error:', error)
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ 
              error: 'Express server not available',
              message: 'Make sure the Express server is running on port 3001'
            }))
          })
        })
      }
    }
  ],
  server: {
    headers: {
      // Security headers for development
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Remove unsafe-inline and unsafe-eval in production
        "style-src 'self' 'unsafe-inline'", // Note: Remove unsafe-inline in production
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https://opensky-network.org https://api.api-ninjas.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
      // Additional security headers
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Permitted-Cross-Domain-Policies': 'none',
    },
  },
})

export default config

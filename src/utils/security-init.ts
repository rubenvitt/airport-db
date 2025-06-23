// Security initialization for the application
import { checkSecureConnection } from './security'

/**
 * Initialize security measures on app startup
 */
export function initializeSecurity() {
  // Check for secure connection in production
  checkSecureConnection()

  // Prevent clickjacking by checking if the app is in an iframe
  if (window.self !== window.top) {
    console.error('This application cannot be loaded in an iframe')
    document.body.innerHTML = 'This application cannot be loaded in an iframe'
    throw new Error('Clickjacking protection: Application loaded in iframe')
  }

  // Disable right-click in production (optional - can be annoying for users)
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => {
      // Allow right-click in text inputs and textareas
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      // You might want to remove this in production as it can be annoying
      // e.preventDefault()
    })
  }

  // Log security initialization
  if (process.env.NODE_ENV === 'development') {
    console.log('Security measures initialized')
  }
}

/**
 * Check if API keys are properly configured
 */
export function validateApiKeys() {
  const requiredEnvVars = ['VITE_OPENSKY_API_URL', 'VITE_API_NINJAS_API_URL']
  const missingVars = requiredEnvVars.filter(
    (varName) => !import.meta.env[varName]
  )

  if (missingVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
    return false
  }

  // Check if API Ninjas key is set (required) - check both possible variable names
  if (!import.meta.env.VITE_API_NINJAS_API_KEY && !import.meta.env.VITE_API_NINJAS_KEY) {
    console.error('API Ninjas API key is required but not set (VITE_API_NINJAS_API_KEY or VITE_API_NINJAS_KEY)')
    return false
  }

  return true
}
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
 * In Next.js, we don't validate API keys on the client side since they're only used server-side
 */
export function validateApiKeys() {
  // In Next.js, API keys are handled server-side only
  // Client doesn't need to validate them
  if (process.env.NODE_ENV === 'development') {
    console.log('API keys are handled server-side in Next.js')
  }
  
  return true
}
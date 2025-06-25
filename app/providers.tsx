'use client'

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

import { AppProvider } from '../src/contexts/AppContext'
import { ComparisonProvider } from '../src/contexts/ComparisonContext'
import { ErrorBoundary } from '../src/components/common'
import { initializeSecurity, validateApiKeys } from '../src/utils/security-init'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 404) return false
          return failureCount < 3
        },
      },
    },
  }))

  // Initialize security measures on mount
  useEffect(() => {
    initializeSecurity()
    
    // Validate API keys
    const apiKeysValid = validateApiKeys()
    if (!apiKeysValid) {
      console.warn('Some API keys are missing. Certain features may not work.')
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <ComparisonProvider>
          <ErrorBoundary>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
          </ErrorBoundary>
        </ComparisonProvider>
      </AppProvider>
    </QueryClientProvider>
  )
}
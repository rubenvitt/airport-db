import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'

import Header from '../components/Header'
import Footer from '../components/Footer'
import { ErrorBoundary } from '../components/common'
import { initializeSecurity, validateApiKeys } from '../utils/security-init'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Airport Database - Track Flights & Explore Airports',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: RootComponent,
})

function RootComponent() {
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
    <RootDocument>
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col">
          <Header />
          
          <main className="flex-1">
            <Outlet />
          </main>
          
          <Footer />
        </div>
        
        <TanStackRouterDevtools />
        <TanStackQueryLayout />
      </ErrorBoundary>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

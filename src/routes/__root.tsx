import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useEffect } from 'react'

import { Header } from '../components/Header'
import Footer from '../components/Footer'
import { ErrorBoundary } from '../components/common'
import { initializeSecurity, validateApiKeys } from '../utils/security-init'
import { AppProvider } from '../contexts/AppContext'

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
  
  // Handle 404 errors
  notFoundComponent: () => {
    return (
      <RootDocument>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 container py-16 max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
              <p className="text-xl text-muted-foreground mb-8">
                The page you're looking for doesn't exist.
              </p>
              <a href="/" className="text-primary hover:underline">
                Go back home
              </a>
            </div>
          </main>
          <Footer />
        </div>
      </RootDocument>
    )
  },
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
      <AppProvider>
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
      </AppProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'system';
                let resolved = 'light';
                
                if (savedTheme === 'system') {
                  resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } else if (savedTheme === 'dark') {
                  resolved = 'dark';
                }
                
                if (resolved === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

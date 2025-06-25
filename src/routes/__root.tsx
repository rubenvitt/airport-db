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
import { ComparisonProvider } from '../contexts/ComparisonContext'

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
        suppressHydrationWarning: true,
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
          <main className="flex-1">
            <div className="container mx-auto px-4 pt-8 lg:pt-12 pb-16 supports-[padding:env(safe-area-inset-top)]:pt-[max(env(safe-area-inset-top),theme(spacing.8))] supports-[padding:env(safe-area-inset-top)]:lg:pt-[max(env(safe-area-inset-top),theme(spacing.12))]">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="text-xl text-muted-foreground mb-8">
                  The page you're looking for doesn't exist.
                </p>
                <a href="/" className="text-primary hover:underline">
                  Go back home
                </a>
              </div>
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
        <ComparisonProvider>
          <ErrorBoundary>
            <div className="min-h-screen flex flex-col">
              <Header />
              
              <main className="flex-1">
                <div className="container mx-auto px-4 pt-8 lg:pt-12 supports-[padding:env(safe-area-inset-top)]:pt-[max(env(safe-area-inset-top),theme(spacing.8))] supports-[padding:env(safe-area-inset-top)]:lg:pt-[max(env(safe-area-inset-top),theme(spacing.12))]">
                  <Outlet />
                </div>
              </main>
              
              <Footer />
            </div>
            
            <TanStackRouterDevtools />
            <TanStackQueryLayout />
          </ErrorBoundary>
        </ComparisonProvider>
      </AppProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
                } else {
                  document.documentElement.classList.remove('dark');
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

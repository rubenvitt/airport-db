import {
  Outlet,
  RouterProvider,
  ScrollRestoration,
  createRootRouteWithContext, createRouter 
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Meta, Scripts } from '@tanstack/start'
import { routeTree } from './routeTree.gen'
import type { ReactNode } from 'react'
import '@/styles.css'
import { Header } from '@/components/Header'
import { Toaster } from '@/components/ui/toaster'
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function createAppRouter() {
  const queryClient = new QueryClient()

  const rootRoute = createRootRouteWithContext<{
    queryClient: QueryClient
  }>()({
    component: RootComponent,
    scripts: () => [
      {
        type: 'module',
        children: `
          // Apply theme before React hydration to prevent flash
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
      },
    ],
  })

  const routerWithRoot = rootRoute.addChildren(routeTree)

  return createRouter({
    routeTree: routerWithRoot,
    defaultPreload: 'intent',
    context: {
      queryClient,
    },
  })
}

function RootComponent() {
  return (
    <RootDocument>
      <Header />
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
      <Toaster />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <link rel="icon" href="/favicon.ico" />
        <title>Airport Database - Live Flight Tracking & Airport Information</title>
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <ReactQueryDevtools initialIsOpen={false} />
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Header } from '../src/components/Header'
import Footer from '../src/components/Footer'
import { Providers } from './providers'
import { ThemeScript } from '../src/components/ThemeScript'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Airport Database - Track Flights & Explore Airports',
  description: 'Track flights and explore airports worldwide',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            
            <main className="flex-1">
              <div className="container mx-auto px-4 pt-8 lg:pt-12 supports-[padding:env(safe-area-inset-top)]:pt-[max(env(safe-area-inset-top),theme(spacing.8))] supports-[padding:env(safe-area-inset-top)]:lg:pt-[max(env(safe-area-inset-top),theme(spacing.12))]">
                {children}
              </div>
            </main>
            
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  )
}
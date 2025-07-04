'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clock, Heart, Home, Map, MapPin, Menu, Monitor, Moon, Plane, Settings, Sun, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/use-theme'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SearchHistoryDropdown } from '@/components/common'

export function Header() {
  const { theme, setTheme, resolvedTheme, isClient } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/airports', label: 'Airports', icon: MapPin },
    { href: '/flights', label: 'Live Flights', icon: Plane },
    { href: '/flights/map', label: 'Flight Map', icon: Map },
    { href: '/favorites', label: 'My Airports', icon: Heart },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center space-x-2 font-bold text-xl">
          <Plane className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline-block">Airport DB</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 ${
                pathname === item.href ? 'bg-accent/50' : ''
              }`}
            >
              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-2">
          {/* Search History */}
          <SearchHistoryDropdown>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label="Search history"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </SearchHistoryDropdown>
          
          {/* Theme selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Select theme"
              >
                {!isClient ? (
                  <Monitor className="h-4 w-4" />
                ) : theme === 'system' ? (
                  <Monitor className="h-4 w-4" />
                ) : resolvedTheme === 'dark' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <nav className="md:hidden border-t">
          <div className="container py-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-start rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full ${
                  pathname === item.href ? 'bg-accent/50' : ''
                }`}
              >
                {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
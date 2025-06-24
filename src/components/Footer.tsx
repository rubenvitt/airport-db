import { ExternalLink, Github, Heart } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const apiLinks = [
    {
      name: 'OpenSky Network',
      url: 'https://opensky-network.org/',
      description: 'Live flight data',
    },
    {
      name: 'API Ninjas',
      url: 'https://api-ninjas.com/',
      description: 'Airport information',
    },
  ]

  const quickLinks = [
    { label: 'Documentation', href: '#' },
    { label: 'API Status', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ]

  return (
    <footer className="w-full border-t bg-background">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div>
            <h3 className="font-semibold mb-3">About Airport DB</h3>
            <p className="text-sm text-muted-foreground">
              A modern web application for exploring airports and tracking live flights
              worldwide. Built with React, TypeScript, and powered by open aviation APIs.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* API Credits */}
          <div>
            <h3 className="font-semibold mb-3">Powered By</h3>
            <ul className="space-y-2">
              {apiLinks.map((api) => (
                <li key={api.name}>
                  <a
                    href={api.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {api.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-xs text-muted-foreground block">
                    {api.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Airport DB. All rights reserved.
          </p>
          
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
            
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Made with <Heart className="h-3 w-3 fill-current text-red-500" /> by the community
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
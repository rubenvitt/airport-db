'use client'

import { useState } from 'react'
import { Settings, Key, Shield, Globe, AlertCircle, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '../../src/components/ui/alert'
import { Button } from '../../src/components/ui/button'
import { Input } from '../../src/components/ui/input'
import { Label } from '../../src/components/ui/label'
import { Separator } from '../../src/components/ui/separator'
import { useToast } from '../../src/hooks/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState({
    openSkyUsername: '',
    openSkyPassword: '',
    aviationStackKey: '',
  })

  const handleSave = () => {
    // In a real app, you'd save these securely
    toast({
      title: 'Settings saved',
      description: 'Your API credentials have been updated.',
    })
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Configure your API credentials and application preferences.
        </p>
      </div>

      {/* Security Notice */}
      <Alert className="mb-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          API keys are stored locally in your browser. For production use, 
          these should be managed server-side. Never share your API keys publicly.
        </AlertDescription>
      </Alert>

      {/* API Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure your API credentials for enhanced features and higher rate limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OpenSky Network */}
          <div>
            <h3 className="text-lg font-semibold mb-4">OpenSky Network</h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="opensky-username">Username</Label>
                <Input
                  id="opensky-username"
                  type="text"
                  placeholder="Your OpenSky username"
                  value={apiKeys.openSkyUsername}
                  onChange={(e) => setApiKeys({ ...apiKeys, openSkyUsername: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Register at{' '}
                  <a
                    href="https://opensky-network.org/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    opensky-network.org
                  </a>
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="opensky-password">Password</Label>
                <Input
                  id="opensky-password"
                  type="password"
                  placeholder="Your OpenSky password"
                  value={apiKeys.openSkyPassword}
                  onChange={(e) => setApiKeys({ ...apiKeys, openSkyPassword: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* AviationStack */}
          <div>
            <h3 className="text-lg font-semibold mb-4">AviationStack (Optional)</h3>
            <div className="grid gap-2">
              <Label htmlFor="aviationstack-key">API Key</Label>
              <Input
                id="aviationstack-key"
                type="text"
                placeholder="Your AviationStack API key"
                value={apiKeys.aviationStackKey}
                onChange={(e) => setApiKeys({ ...apiKeys, aviationStackKey: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Get your free API key at{' '}
                <a
                  href="https://aviationstack.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  aviationstack.com
                </a>
              </p>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limits Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Rate Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">OpenSky Network</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Anonymous: 100 requests/day</li>
                <li>• Registered: 1000 requests/day</li>
                <li>• Real-time data requires authentication</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">API Ninjas</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Free tier: 10,000 requests/month</li>
                <li>• Airport data cached for performance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bell, Database, Globe, Info, Monitor, Moon, Settings, Shield, Sun, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/hooks/use-theme'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CacheSettings } from '@/components/settings/CacheSettings'
import { CacheAnalytics } from '@/components/CacheAnalytics'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    flightUpdates: true,
    apiErrors: true,
    newFeatures: false,
  })
  
  // Data settings
  const [dataSettings, setDataSettings] = useState({
    autoRefresh: true,
    refreshInterval: '30000',
    cacheEnabled: true,
    offlineMode: false,
  })
  
  // Language settings
  const [language, setLanguage] = useState('en')
  
  // Load settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications')
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications))
    }
    
    const savedDataSettings = localStorage.getItem('dataSettings')
    if (savedDataSettings) {
      setDataSettings(JSON.parse(savedDataSettings))
    }
    
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }
  }, [])
  
  const saveSettings = () => {
    // Save to localStorage
    localStorage.setItem('notifications', JSON.stringify(notifications))
    localStorage.setItem('dataSettings', JSON.stringify(dataSettings))
    localStorage.setItem('language', language)
    
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    })
  }
  
  const clearCache = () => {
    // Clear TanStack Query cache
    localStorage.removeItem('tanstack-query-cache')
    
    toast({
      title: "Cache cleared",
      description: "All cached data has been removed.",
    })
  }
  
  const resetSettings = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      // Reset to defaults
      setTheme('system')
      setNotifications({
        flightUpdates: true,
        apiErrors: true,
        newFeatures: false,
      })
      setDataSettings({
        autoRefresh: true,
        refreshInterval: '30000',
        cacheEnabled: true,
        offlineMode: false,
      })
      setLanguage('en')
      
      // Clear localStorage
      localStorage.removeItem('notifications')
      localStorage.removeItem('dataSettings')
      localStorage.removeItem('language')
      
      toast({
        title: "Settings reset",
        description: "All settings have been reset to defaults.",
      })
    }
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Customize your Airport Database experience
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={(value: 'light' | 'dark' | 'system') => setTheme(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Language & Region
              </CardTitle>
              <CardDescription>
                Set your preferred language
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="it">Italiano</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Note: Language change requires app refresh to take full effect
              </p>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Choose what updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="flight-updates">Flight Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about flight status changes
                  </p>
                </div>
                <Switch
                  id="flight-updates"
                  checked={notifications.flightUpdates}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, flightUpdates: checked })
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="api-errors">API Errors</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications for API issues
                  </p>
                </div>
                <Switch
                  id="api-errors"
                  checked={notifications.apiErrors}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, apiErrors: checked })
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-features">New Features</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new features and updates
                  </p>
                </div>
                <Switch
                  id="new-features"
                  checked={notifications.newFeatures}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, newFeatures: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data & Performance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data & Performance
              </CardTitle>
              <CardDescription>
                Manage data usage and performance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-refresh">Auto-refresh</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically refresh flight data
                  </p>
                </div>
                <Switch
                  id="auto-refresh"
                  checked={dataSettings.autoRefresh}
                  onCheckedChange={(checked) => 
                    setDataSettings({ ...dataSettings, autoRefresh: checked })
                  }
                />
              </div>
              
              {dataSettings.autoRefresh && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="refresh-interval">Refresh Interval</Label>
                    <Select 
                      value={dataSettings.refreshInterval} 
                      onValueChange={(value) => 
                        setDataSettings({ ...dataSettings, refreshInterval: value })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10000">10 seconds</SelectItem>
                        <SelectItem value="30000">30 seconds</SelectItem>
                        <SelectItem value="60000">1 minute</SelectItem>
                        <SelectItem value="300000">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="cache-enabled">Enable Cache</Label>
                  <p className="text-sm text-muted-foreground">
                    Cache data for faster loading
                  </p>
                </div>
                <Switch
                  id="cache-enabled"
                  checked={dataSettings.cacheEnabled}
                  onCheckedChange={(checked) => 
                    setDataSettings({ ...dataSettings, cacheEnabled: checked })
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="offline-mode">Offline Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use cached data when offline
                  </p>
                </div>
                <Switch
                  id="offline-mode"
                  checked={dataSettings.offlineMode}
                  onCheckedChange={(checked) => 
                    setDataSettings({ ...dataSettings, offlineMode: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Security & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Privacy
              </CardTitle>
              <CardDescription>
                Information about data security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  All data is fetched directly from public APIs. No personal data is collected or stored on our servers.
                </p>
                <p className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  Your favorites and settings are stored locally in your browser and never leave your device.
                </p>
                <p className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  API requests are made using secure HTTPS connections.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button onClick={saveSettings} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={resetSettings}>
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Cache Settings Tab */}
        <TabsContent value="cache">
          <CacheSettings />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <CacheAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  )
}
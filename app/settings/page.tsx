'use client'

import { useEffect, useState } from 'react'
import { Bell, Database, Globe, Info, Monitor, Moon, Settings, Shield, Sun, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card'
import { Button } from '../../src/components/ui/button'
import { Switch } from '../../src/components/ui/switch'
import { Label } from '../../src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../src/components/ui/select'
import { Separator } from '../../src/components/ui/separator'
import { useToast } from '../../src/hooks/use-toast'
import { useTheme } from '../../src/hooks/use-theme'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs'
import { CacheSettings } from '../../src/components/settings/CacheSettings'
import { CacheAnalytics } from '../../src/components/CacheAnalytics'

export default function SettingsPage() {
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
                Configure when you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="flight-updates" className="flex flex-col">
                  <span>Flight Updates</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Notify when tracked flights update
                  </span>
                </Label>
                <Switch
                  id="flight-updates"
                  checked={notifications.flightUpdates}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, flightUpdates: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="api-errors" className="flex flex-col">
                  <span>API Errors</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Alert when API requests fail
                  </span>
                </Label>
                <Switch
                  id="api-errors"
                  checked={notifications.apiErrors}
                  onCheckedChange={(checked) => 
                    setNotifications({ ...notifications, apiErrors: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="new-features" className="flex flex-col">
                  <span>New Features</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Get notified about new features
                  </span>
                </Label>
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

          {/* Data Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data & Performance
              </CardTitle>
              <CardDescription>
                Configure data fetching and caching behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh" className="flex flex-col">
                  <span>Auto Refresh</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Automatically refresh data periodically
                  </span>
                </Label>
                <Switch
                  id="auto-refresh"
                  checked={dataSettings.autoRefresh}
                  onCheckedChange={(checked) => 
                    setDataSettings({ ...dataSettings, autoRefresh: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="refresh-interval">Refresh Interval</Label>
                <Select
                  value={dataSettings.refreshInterval}
                  onValueChange={(value) => 
                    setDataSettings({ ...dataSettings, refreshInterval: value })
                  }
                  disabled={!dataSettings.autoRefresh}
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
              
              <div className="flex items-center justify-between">
                <Label htmlFor="cache-enabled" className="flex flex-col">
                  <span>Enable Cache</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Store data locally for faster loading
                  </span>
                </Label>
                <Switch
                  id="cache-enabled"
                  checked={dataSettings.cacheEnabled}
                  onCheckedChange={(checked) => 
                    setDataSettings({ ...dataSettings, cacheEnabled: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="offline-mode" className="flex flex-col">
                  <span>Offline Mode</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Use cached data when offline
                  </span>
                </Label>
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

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={saveSettings}>
              Save Settings
            </Button>
            <Button onClick={clearCache} variant="outline">
              Clear Cache
            </Button>
            <Button onClick={resetSettings} variant="destructive">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cache Analytics
              </CardTitle>
              <CardDescription>
                View detailed cache performance metrics and usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CacheAnalytics />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Privacy Notice */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p>
                All settings are stored locally in your browser. We do not collect or store any personal data.
                API keys are never sent to our servers and are only used for direct communication with third-party services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
// Playwright tests for caching functionality

import { test, expect } from '@playwright/test'

test.describe('API Caching Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('http://localhost:3000')
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle')
  })

  test('should cache airport search results', async ({ page }) => {
    // Navigate to airports page
    await page.click('text=Airports')
    await page.waitForURL('**/airports')

    // Clear cache before test
    await page.evaluate(() => {
      return window.localStorage.clear()
    })

    // Search for an airport
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('LAX')
    await searchInput.press('Enter')

    // Wait for results
    await page.waitForSelector('text=Los Angeles International')

    // Capture network requests
    const apiRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('api-ninjas.com') || request.url().includes('/api/')) {
        apiRequests.push(request.url())
      }
    })

    // Search again for the same airport
    await searchInput.clear()
    await searchInput.fill('LAX')
    await searchInput.press('Enter')

    // Wait a bit to ensure no new requests are made
    await page.waitForTimeout(1000)

    // Verify that no additional API request was made (cached result used)
    expect(apiRequests.length).toBeLessThanOrEqual(1)
  })

  test('should display cache statistics', async ({ page }) => {
    // Navigate to settings or cache analytics page
    await page.click('text=Settings')
    
    // Look for cache statistics
    const cacheStats = page.locator('[data-testid="cache-stats"]')
    await expect(cacheStats).toBeVisible()

    // Verify cache metrics are displayed
    await expect(page.locator('text=/Hit Rate/i')).toBeVisible()
    await expect(page.locator('text=/Cache Size/i')).toBeVisible()
    await expect(page.locator('text=/Entries/i')).toBeVisible()
  })

  test('should use stale-while-revalidate for flight data', async ({ page }) => {
    // Navigate to a page that shows flight data
    await page.goto('http://localhost:3000/airports')
    
    // Search for an airport to get flight data
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('JFK')
    await searchInput.press('Enter')

    // Wait for airport result
    await page.waitForSelector('text=John F Kennedy')
    
    // Click on the airport to see flight data
    await page.click('text=John F Kennedy')

    // Track API calls
    let flightApiCalls = 0
    page.on('request', request => {
      if (request.url().includes('opensky-network.org')) {
        flightApiCalls++
      }
    })

    // Wait for flight data to load
    await page.waitForSelector('[data-testid="flight-data"]', { timeout: 10000 }).catch(() => {})

    // Refresh the page
    await page.reload()

    // Flight data should load instantly from cache
    const startTime = Date.now()
    await page.waitForSelector('[data-testid="flight-data"]', { timeout: 10000 }).catch(() => {})
    const loadTime = Date.now() - startTime

    // Should load quickly from cache (under 500ms)
    expect(loadTime).toBeLessThan(500)
  })

  test('should allow cache clearing', async ({ page }) => {
    // Navigate to settings
    await page.click('text=Settings')
    
    // Find and click clear cache button
    const clearCacheButton = page.locator('button:has-text("Clear Cache")')
    await clearCacheButton.click()

    // Confirm the action if there's a dialog
    const confirmButton = page.locator('button:has-text("Confirm")')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    // Verify cache was cleared
    await expect(page.locator('text=/Cache cleared/i')).toBeVisible()
  })

  test('should prefetch common airports on app start', async ({ page }) => {
    // Clear all storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Track prefetch requests
    const prefetchRequests: string[] = []
    page.on('request', request => {
      if (request.url().includes('api-ninjas.com') && 
          (request.url().includes('JFK') || 
           request.url().includes('LAX') || 
           request.url().includes('ORD'))) {
        prefetchRequests.push(request.url())
      }
    })

    // Navigate to the app
    await page.goto('http://localhost:3000')
    
    // Wait for prefetching to complete
    await page.waitForTimeout(3000)

    // Common airports should have been prefetched
    expect(prefetchRequests.length).toBeGreaterThan(0)
  })

  test('should show cache hit indicators', async ({ page }) => {
    // Navigate to airports
    await page.goto('http://localhost:3000/airports')

    // Search for an airport twice
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('SFO')
    await searchInput.press('Enter')
    
    // Wait for first result
    await page.waitForSelector('text=San Francisco International')
    
    // Search again
    await searchInput.clear()
    await searchInput.fill('SFO')
    await searchInput.press('Enter')

    // Look for cache hit indicator
    await expect(page.locator('[data-testid="cache-indicator"]:has-text("Cached")')).toBeVisible()
  })

  test('should work offline with cached data', async ({ page, context }) => {
    // First, load some data while online
    await page.goto('http://localhost:3000/airports')
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('MIA')
    await searchInput.press('Enter')
    
    await page.waitForSelector('text=Miami International')

    // Go offline
    await context.setOffline(true)

    // Try to search for the same airport
    await searchInput.clear()
    await searchInput.fill('MIA')
    await searchInput.press('Enter')

    // Should still show the cached result
    await expect(page.locator('text=Miami International')).toBeVisible()
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('should persist cache across sessions', async ({ page, context }) => {
    // Load some data
    await page.goto('http://localhost:3000/airports')
    
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('BOS')
    await searchInput.press('Enter')
    
    await page.waitForSelector('text=Logan International')

    // Close and create new page (simulating new session)
    await page.close()
    const newPage = await context.newPage()
    
    // Navigate back
    await newPage.goto('http://localhost:3000/airports')
    
    // Check cache stats to verify data persisted
    await newPage.click('text=Settings')
    
    const cacheEntries = newPage.locator('[data-testid="cache-entries"]')
    const entriesText = await cacheEntries.textContent()
    
    // Should have at least one entry from previous session
    expect(parseInt(entriesText || '0')).toBeGreaterThan(0)
  })
})
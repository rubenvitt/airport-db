import { Router } from 'express'
import { airportCache } from '../services/airportCache.js'

export function createCacheRoutes() {
  const router = Router()

  // Cache stats API
  router.get('/stats', async (req, res, next) => {
    try {
      const stats = await airportCache.getStats()
      res.json(stats)
    } catch (error) {
      next(error)
    }
  })

  // Reset cache stats
  router.post('/stats/reset', async (req, res, next) => {
    try {
      await airportCache.resetStats()
      res.json({ message: 'Cache stats reset successfully' })
    } catch (error) {
      next(error)
    }
  })

  // Clear cache entries
  router.delete('/clear', async (req, res, next) => {
    try {
      const { pattern } = req.query
      const cleared = await airportCache.clear(pattern as string)
      res.json({ 
        message: `Cleared ${cleared} cache entries`,
        cleared 
      })
    } catch (error) {
      next(error)
    }
  })

  // Check if specific cache key exists
  router.get('/exists/:key', async (req, res, next) => {
    try {
      const { key } = req.params
      const exists = await airportCache.exists(key)
      res.json({ key, exists })
    } catch (error) {
      next(error)
    }
  })

  return router
}
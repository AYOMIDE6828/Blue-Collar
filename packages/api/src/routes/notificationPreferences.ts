import { Router } from 'express'
import type { Request, Response } from 'express'
import { notificationPreferencesRepository, ALLOWED_PREF_FIELDS } from '../repositories/notificationPreferences.repository.js'
import { createServiceLogger } from '../utils/logger.js'

const router = Router()
const logger = createServiceLogger('NotificationPreferences')

// GET /api/notifications/preferences
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const prefs = await notificationPreferencesRepository.findOrCreate(userId)
    res.json(prefs)
  } catch (err) {
    logger.error('GET notification prefs error', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

// PUT /api/notifications/preferences
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const updates: Partial<Record<(typeof ALLOWED_PREF_FIELDS)[number], boolean>> = {}

    for (const field of ALLOWED_PREF_FIELDS) {
      if (field in req.body) {
        if (typeof req.body[field] !== 'boolean') {
          return res.status(400).json({ error: `Field '${field}' must be a boolean.` })
        }
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided.' })
    }

    const prefs = await notificationPreferencesRepository.upsert(userId, updates)
    res.json(prefs)
  } catch (err) {
    logger.error('PUT notification prefs error', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

export default router

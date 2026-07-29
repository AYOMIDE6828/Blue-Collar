import { Router } from 'express'
import type { Request, Response } from 'express'
import { notificationPreferencesRepository } from '../repositories/notificationPreferences.repository.js'
import { logger } from '../config/logger.js'

const router = Router()

const ALLOWED_FIELDS = [
  'newWorkerNearby',
  'statusChange',
  'reviewReply',
  'announcements',
] as const

type AllowedField = (typeof ALLOWED_FIELDS)[number]

// GET /api/notifications/preferences
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    let prefs = await notificationPreferencesRepository.findByUserId(userId)
    if (!prefs) {
      prefs = await notificationPreferencesRepository.createDefaults(userId)
    }
    return res.json(prefs)
  } catch (err) {
    logger.error({ err }, 'GET notification prefs error')
    return res.status(500).json({ error: 'Internal server error.' })
  }
})

// PUT /api/notifications/preferences
router.put('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id
    const updates: Partial<Record<AllowedField, boolean>> = {}

    for (const field of ALLOWED_FIELDS) {
      if (field in req.body) {
        if (typeof req.body[field] !== 'boolean') {
          return res
            .status(400)
            .json({ error: `Field '${field}' must be a boolean.` })
        }
        updates[field] = req.body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided.' })
    }

    const prefs = await notificationPreferencesRepository.upsert(userId, updates)
    return res.json(prefs)
  } catch (err) {
    logger.error({ err }, 'PUT notification prefs error')
    return res.status(500).json({ error: 'Internal server error.' })
  }
})

export default router

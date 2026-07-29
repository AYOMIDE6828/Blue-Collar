import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationPreferencesRepository } from '../repositories/notificationPreferences.repository.js'

// ── Mock Prisma ───────────────────────────────────────────────────────────────

vi.mock('../db.js', () => ({
  db: {
    notificationPreferences: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { db } from '../db.js'

const defaultPrefs = {
  id: 'pref-1',
  userId: 'user-1',
  newWorkerNearby: true,
  statusChange: true,
  reviewReply: true,
  announcements: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ── NotificationPreferencesRepository ─────────────────────────────────────────

describe('NotificationPreferencesRepository', () => {
  let repo: NotificationPreferencesRepository

  beforeEach(() => {
    repo = new NotificationPreferencesRepository()
    vi.clearAllMocks()
  })

  describe('findByUserId', () => {
    it('calls db.notificationPreferences.findUnique with userId', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(defaultPrefs as any)
      const result = await repo.findByUserId('user-1')
      expect(db.notificationPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      })
      expect(result).toEqual(defaultPrefs)
    })

    it('returns null when no prefs row exists', async () => {
      vi.mocked(db.notificationPreferences.findUnique).mockResolvedValue(null)
      const result = await repo.findByUserId('missing-user')
      expect(result).toBeNull()
    })
  })

  describe('createDefaults', () => {
    it('creates prefs with all defaults set to true', async () => {
      vi.mocked(db.notificationPreferences.create).mockResolvedValue(defaultPrefs as any)
      const result = await repo.createDefaults('user-1')
      expect(db.notificationPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          newWorkerNearby: true,
          statusChange: true,
          reviewReply: true,
          announcements: true,
        },
      })
      expect(result).toEqual(defaultPrefs)
    })
  })

  describe('upsert', () => {
    it('upserts with provided updates merged over defaults', async () => {
      const updated = { ...defaultPrefs, announcements: false }
      vi.mocked(db.notificationPreferences.upsert).mockResolvedValue(updated as any)
      const result = await repo.upsert('user-1', { announcements: false })
      expect(db.notificationPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { announcements: false },
        create: {
          userId: 'user-1',
          newWorkerNearby: true,
          statusChange: true,
          reviewReply: true,
          announcements: false,
        },
      })
      expect(result.announcements).toBe(false)
    })

    it('merges partial updates without clobbering unrelated fields', async () => {
      const updated = { ...defaultPrefs, statusChange: false }
      vi.mocked(db.notificationPreferences.upsert).mockResolvedValue(updated as any)
      await repo.upsert('user-1', { statusChange: false })
      const call = (vi.mocked(db.notificationPreferences.upsert).mock.calls[0] as any[])[0] as any
      expect(call.update).toEqual({ statusChange: false })
      // create should still include remaining defaults
      expect(call.create.newWorkerNearby).toBe(true)
      expect(call.create.reviewReply).toBe(true)
      expect(call.create.announcements).toBe(true)
    })

    it('accepts multiple field updates in one call', async () => {
      vi.mocked(db.notificationPreferences.upsert).mockResolvedValue({
        ...defaultPrefs,
        newWorkerNearby: false,
        reviewReply: false,
      } as any)
      await repo.upsert('user-1', { newWorkerNearby: false, reviewReply: false })
      const call = (vi.mocked(db.notificationPreferences.upsert).mock.calls[0] as any[])[0] as any
      expect(call.update).toEqual({ newWorkerNearby: false, reviewReply: false })
    })
  })
})

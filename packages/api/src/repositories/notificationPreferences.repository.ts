import type { NotificationPreferences } from '@prisma/client'
import { db } from '../db.js'

const DEFAULT_PREFS = {
  newWorkerNearby: true,
  statusChange: true,
  reviewReply: true,
  announcements: true,
} as const

export type AllowedPrefField = keyof typeof DEFAULT_PREFS

export const ALLOWED_PREF_FIELDS: AllowedPrefField[] = [
  'newWorkerNearby',
  'statusChange',
  'reviewReply',
  'announcements',
]

// ── Repository ───────────────────────────────────────────────────────────────

export class NotificationPreferencesRepository {
  /**
   * Find preferences for a user. Returns null if none exist yet.
   */
  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    return db.notificationPreferences.findUnique({ where: { userId } })
  }

  /**
   * Return preferences for a user, creating defaults if they don't exist yet.
   */
  async findOrCreate(userId: string): Promise<NotificationPreferences> {
    const existing = await this.findByUserId(userId)
    if (existing) return existing
    return db.notificationPreferences.create({
      data: { userId, ...DEFAULT_PREFS },
    })
  }

  /**
   * Upsert (partial) preferences for a user.
   */
  async upsert(
    userId: string,
    updates: Partial<Record<AllowedPrefField, boolean>>,
  ): Promise<NotificationPreferences> {
    return db.notificationPreferences.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...DEFAULT_PREFS, ...updates },
    })
  }

  /**
   * Check whether a specific notification type is enabled for a user.
   * Returns true if no preferences exist (opt-in by default).
   */
  async isEnabled(userId: string, type: string): Promise<boolean> {
    const prefs = await this.findByUserId(userId)
    if (!prefs) return true
    if (!(type in prefs)) throw new Error(`Unknown notification type: ${type}`)
    return (prefs as Record<string, unknown>)[type] as boolean
  }

  /**
   * Seed default preferences for a new user (idempotent upsert).
   */
  async seedDefaults(userId: string): Promise<NotificationPreferences> {
    return db.notificationPreferences.upsert({
      where: { userId },
      update: {},
      create: { userId, ...DEFAULT_PREFS },
    })
  }
}

export const notificationPreferencesRepository = new NotificationPreferencesRepository()

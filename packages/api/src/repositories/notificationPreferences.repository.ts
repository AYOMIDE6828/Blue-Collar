import type { NotificationPreferences, Prisma } from '@prisma/client'
import { db } from '../db.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationPreferencesUpdateInput = Partial<{
  newWorkerNearby: boolean
  statusChange: boolean
  reviewReply: boolean
  announcements: boolean
}>

// ── Repository ────────────────────────────────────────────────────────────────

export class NotificationPreferencesRepository {
  /**
   * Find the notification preferences for a user.
   * Returns null when no row exists yet.
   */
  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    return db.notificationPreferences.findUnique({ where: { userId } })
  }

  /**
   * Create default notification preferences for a user.
   */
  async createDefaults(userId: string): Promise<NotificationPreferences> {
    return db.notificationPreferences.create({
      data: {
        userId,
        newWorkerNearby: true,
        statusChange: true,
        reviewReply: true,
        announcements: true,
      },
    })
  }

  /**
   * Upsert notification preferences, merging the supplied updates on top of
   * the defaults so that missing fields are always present.
   */
  async upsert(
    userId: string,
    updates: NotificationPreferencesUpdateInput,
  ): Promise<NotificationPreferences> {
    return db.notificationPreferences.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        newWorkerNearby: true,
        statusChange: true,
        reviewReply: true,
        announcements: true,
        ...updates,
      },
    })
  }
}

export const notificationPreferencesRepository = new NotificationPreferencesRepository()

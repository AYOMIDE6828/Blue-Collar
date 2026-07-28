/**
 * Notification preference helpers.
 * Delegates to the NotificationPreferencesRepository — uses the shared db
 * singleton instead of instantiating a separate PrismaClient.
 */
import { notificationPreferencesRepository } from '../repositories/notificationPreferences.repository.js'

export async function seedDefaultPreferences(userId: string) {
  return notificationPreferencesRepository.seedDefaults(userId)
}

export async function isNotificationEnabled(userId: string, type: string): Promise<boolean> {
  return notificationPreferencesRepository.isEnabled(userId, type)
}

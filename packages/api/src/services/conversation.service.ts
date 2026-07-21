import { db } from '../db.js'
import { AppError } from './AppError.js'
import * as notificationService from './notification.service.js'
import { logger } from '../config/logger.js'

export async function create(userId: string, participantId: string, subject?: string, initialMessage?: string) {
  const participant = await db.user.findUnique({ where: { id: participantId } })
  if (!participant) throw new AppError('Participant not found', 404)

  return db.conversation.create({
    data: {
      subject,
      participants: {
        createMany: {
          data: [
            { userId, joinedAt: new Date() },
            { userId: participantId, joinedAt: new Date() },
          ],
        },
      },
      messages: initialMessage
        ? { create: { senderId: userId, body: initialMessage } }
        : undefined,
    },
    include: {
      participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
      messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
    },
  })
}

export async function listForUser(userId: string, page: number, limit: number) {
  const where = { participants: { some: { userId } } }
  const [data, total] = await Promise.all([
    db.conversation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' }, include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
      },
    }),
    db.conversation.count({ where }),
  ])

  const conversationsWithUnread = await Promise.all(
    data.map(async (conv) => {
      const myParticipation = conv.participants.find(p => p.userId === userId)
      const unreadCount = myParticipation?.lastReadAt
        ? await db.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              createdAt: { gt: myParticipation.lastReadAt },
            },
          })
        : await db.message.count({
            where: { conversationId: conv.id, senderId: { not: userId } },
          })
      return { ...conv, unreadCount }
    })
  )

  return { data: conversationsWithUnread, meta: { total, page, limit, pages: Math.ceil(total / limit) } }
}

export async function getById(id: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      participants: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
    },
  })
  if (!conversation) throw new AppError('Conversation not found', 404)
  if (!conversation.participants.some(p => p.userId === userId)) {
    throw new AppError('Forbidden', 403)
  }
  return conversation
}

export async function addMessage(conversationId: string, senderId: string, body: string, attachmentUrl?: string, attachmentType?: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: true },
  })
  if (!conversation) throw new AppError('Conversation not found', 404)
  if (!conversation.participants.some(p => p.userId === senderId)) {
    throw new AppError('You are not a participant', 403)
  }

  const [message] = await db.$transaction([
    db.message.create({
      data: { conversationId, senderId, body, attachmentUrl, attachmentType },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    }),
    db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ])

  const recipients = conversation.participants.filter(p => p.userId !== senderId)
  await Promise.all(
    recipients.map(async (recipient) => {
      try {
        await notificationService.dispatchNotification({
          userId: recipient.userId,
          type: 'message',
          title: 'New message',
          message: body.length > 140 ? `${body.slice(0, 140)}…` : body,
          channels: ['inapp'],
          href: '/messages',
        })
      } catch (err) {
        logger.error({ err, userId: recipient.userId, conversationId }, 'Failed to dispatch message notification')
      }
    })
  )

  return message
}

export async function listMessages(conversationId: string, userId: string, page: number, limit: number) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { where: { userId } } },
  })
  if (!conversation) throw new AppError('Conversation not found', 404)
  if (conversation.participants.length === 0) throw new AppError('Forbidden', 403)

  const where = { conversationId }
  const [data, total] = await Promise.all([
    db.message.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
    }),
    db.message.count({ where }),
  ])

  return { data: data.reverse(), meta: { total, page, limit, pages: Math.ceil(total / limit) } }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const participations = await db.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true, lastReadAt: true },
  })

  const counts = await Promise.all(
    participations.map((p) =>
      db.message.count({
        where: {
          conversationId: p.conversationId,
          senderId: { not: userId },
          ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
        },
      })
    )
  )

  return counts.reduce((total, count) => total + count, 0)
}

export async function searchMessages(conversationId: string, userId: string, query: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { where: { userId } } },
  })
  if (!conversation) throw new AppError('Conversation not found', 404)
  if (conversation.participants.length === 0) throw new AppError('Forbidden', 403)

  return db.message.findMany({
    where: {
      conversationId,
      body: { contains: query, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
  })
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } })
  if (!message) throw new AppError('Message not found', 404)
  if (message.senderId !== userId) throw new AppError('Unauthorized', 403)

  return db.message.update({
    where: { id: messageId },
    data: { body: '[deleted]', attachmentUrl: null, attachmentType: null },
  })
}

export async function markRead(conversationId: string, userId: string) {
  const participant = await db.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  })
  if (!participant) throw new AppError('Not a participant', 403)

  await db.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date() },
  })

  await db.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  })
}

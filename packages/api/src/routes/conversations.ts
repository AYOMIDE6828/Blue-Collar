import { Router } from 'express'
import {
  listConversations,
  startConversation,
  getConversation,
  sendMessage,
  listMessages,
  markConversationRead,
  getUnreadCount,
  searchMessages,
  deleteMessage,
} from '../controllers/conversations.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// NOTE: '/unread' must be registered before '/:id' — otherwise Express would
// match it as GET /:id with id === 'unread'.
router.get('/unread', getUnreadCount)
router.get('/', listConversations)
router.post('/', startConversation)
router.get('/:id', getConversation)
router.get('/:id/messages', listMessages)
router.get('/:id/messages/search', searchMessages)
router.post('/:id/messages', sendMessage)
router.patch('/:id/read', markConversationRead)
router.delete('/:messageId', deleteMessage)

export default router

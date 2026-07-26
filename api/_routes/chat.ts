import { Hono } from 'hono'
import { prisma } from '../_lib/prisma.js'
import { requireAuth, JwtPayload } from '../_lib/auth.js'
import { z } from 'zod'

const chat = new Hono<{ Variables: { user: JwtPayload } }>()

// Protect all chat endpoints for logged in users
chat.use('*', requireAuth())

// Get contact list with unread counts & latest message
chat.get('/contacts', async (c) => {
  const { userId } = c.get('user')

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isSharedAccount: true,
      division: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Get unread message counts per sender
  const unreadCounts = await prisma.directMessage.groupBy({
    by: ['senderId'],
    where: {
      receiverId: userId,
      isRead: false,
    },
    _count: { id: true },
  })

  const unreadMap = new Map<string, number>()
  unreadCounts.forEach((item) => {
    unreadMap.set(item.senderId, item._count.id)
  })

  // Get last messages for each conversation involving currentUser
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      createdAt: true,
    },
  })

  const lastMessageMap = new Map<string, { content: string; createdAt: Date; senderId: string }>()
  messages.forEach((msg) => {
    const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId
    if (!lastMessageMap.has(partnerId)) {
      lastMessageMap.set(partnerId, {
        content: msg.content,
        createdAt: msg.createdAt,
        senderId: msg.senderId,
      })
    }
  })

  const contactsWithDetails = users.map((u) => ({
    ...u,
    unreadCount: unreadMap.get(u.id) || 0,
    lastMessage: lastMessageMap.get(u.id) || null,
  }))

  // Sort contacts by last message date if available, then by unreadCount, then name
  contactsWithDetails.sort((a, b) => {
    if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
    if (timeA !== timeB) return timeB - timeA
    return a.name.localeCompare(b.name)
  })

  return c.json(contactsWithDetails)
})

// Get chat history with partnerId
chat.get('/messages', async (c) => {
  const { userId } = c.get('user')
  const partnerId = c.req.query('partnerId')

  if (!partnerId) {
    return c.json({ error: 'partnerId wajib diisi' }, 400)
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      senderId: true,
      receiverId: true,
      content: true,
      isRead: true,
      createdAt: true,
    },
  })

  return c.json(messages)
})

// Send private message
const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1),
})

chat.post('/messages', async (c) => {
  const { userId } = c.get('user')
  const body = sendMessageSchema.parse(await c.req.json())

  if (userId === body.receiverId) {
    return c.json({ error: 'Tidak dapat mengirim pesan ke diri sendiri' }, 400)
  }

  const receiver = await prisma.user.findUnique({
    where: { id: body.receiverId },
  })
  if (!receiver) {
    return c.json({ error: 'Penerima pesan tidak ditemukan' }, 404)
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  })

  const message = await prisma.directMessage.create({
    data: {
      senderId: userId,
      receiverId: body.receiverId,
      content: body.content,
    },
  })

  // Create notification for receiver
  await prisma.notification.create({
    data: {
      userId: body.receiverId,
      type: 'PRIVATE_CHAT',
      message: `Pesan privat baru dari ${sender?.name || 'Seseorang'}: "${body.content.slice(0, 40)}${body.content.length > 40 ? '...' : ''}"`,
    },
  })

  return c.json(message)
})

// Mark messages as read
const markReadSchema = z.object({
  partnerId: z.string().min(1),
})

chat.put('/read', async (c) => {
  const { userId } = c.get('user')
  const body = markReadSchema.parse(await c.req.json())

  await prisma.directMessage.updateMany({
    where: {
      senderId: body.partnerId,
      receiverId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  })

  return c.json({ success: true })
})

export default chat

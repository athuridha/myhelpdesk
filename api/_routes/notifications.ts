import { Hono } from 'hono'
import { prisma } from '../_lib/prisma.js'
import { requireAuth, JwtPayload } from '../_lib/auth.js'

const notifications = new Hono<{ Variables: { user: JwtPayload } }>()

notifications.get('/', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  return c.json(
    await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  )
})

notifications.patch('/read-all', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
  return c.json({ ok: true })
})

notifications.post('/invite-meeting', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  const body = await c.req.json()
  const { invitedUserIds, roomTitle } = body

  if (Array.isArray(invitedUserIds) && invitedUserIds.length > 0) {
    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    const senderName = sender?.name || 'Rekan Kerja'

    await prisma.notification.createMany({
      data: invitedUserIds.map((targetId: string) => ({
        userId: targetId,
        type: 'MEETING_INVITE',
        message: `📹 Undangan Meeting: "${roomTitle}" oleh ${senderName}. Klik untuk bergabung!`,
      })),
    })
  }

  return c.json({ ok: true })
})

export default notifications

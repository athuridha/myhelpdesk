import { Hono } from 'hono'
import { prisma } from '../_lib/prisma'
import { requireAuth } from '../_lib/auth'

const notifications = new Hono()

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

export default notifications

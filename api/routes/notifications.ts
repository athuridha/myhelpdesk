import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'

const notifications = new Hono()

notifications.get('/', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return c.json(items)
})

notifications.patch('/read-all', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
  return c.json({ ok: true })
})

notifications.patch('/:id/read', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  await prisma.notification.updateMany({
    where: { id: c.req.param('id'), userId },
    data: { isRead: true },
  })
  return c.json({ ok: true })
})

export default notifications

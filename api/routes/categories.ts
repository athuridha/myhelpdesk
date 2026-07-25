import { Hono } from 'hono'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../lib/auth.js'
import { z } from 'zod'

const categories = new Hono()

categories.get('/', requireAuth(), async (c) => {
  const { divisionId: qDiv } = c.req.query()
  const where = qDiv ? { divisionId: qDiv } : {}
  return c.json(
    await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { division: { select: { id: true, name: true, code: true } } },
    })
  )
})

const catSchema = z.object({
  name: z.string().min(1),
  divisionId: z.string(),
  slaCriticalHours: z.number().optional(),
  slaHighHours: z.number().optional(),
  slaMediumHours: z.number().optional(),
  slaLowHours: z.number().optional(),
})

categories.post('/', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { role: actorRole, divisionId: actorDiv } = c.get('user')
  const body = catSchema.parse(await c.req.json())

  if (actorRole === 'division_admin' && body.divisionId !== actorDiv) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  return c.json(await prisma.category.create({ data: body }), 201)
})

categories.patch('/:id', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { role: actorRole, divisionId: actorDiv } = c.get('user')
  const cat = await prisma.category.findUnique({ where: { id: c.req.param('id') } })
  if (!cat) return c.json({ error: 'Not found' }, 404)

  if (actorRole === 'division_admin' && cat.divisionId !== actorDiv) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = catSchema.partial().parse(await c.req.json())
  return c.json(await prisma.category.update({ where: { id: cat.id }, data: body }))
})

export default categories

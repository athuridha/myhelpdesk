import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const categories = new Hono()

categories.get('/', requireAuth(), async (c) => {
  const { divisionId: qDiv } = c.req.query()
  const where: Record<string, unknown> = { isActive: true }
  if (qDiv) {
    where.divisionId = qDiv
  }
  return c.json(
    await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        division: { select: { id: true, name: true, code: true } },
        formFields: { orderBy: { order: 'asc' } },
      },
    })
  )
})

categories.get('/:id/form-schema', requireAuth(), async (c) => {
  const fields = await prisma.formField.findMany({
    where: { categoryId: c.req.param('id') },
    orderBy: { order: 'asc' },
  })
  return c.json(fields)
})

const catSchema = z.object({
  name: z.string().min(1),
  divisionId: z.string(),
  slaCriticalHours: z.number().int().positive().default(4),
  slaHighHours: z.number().int().positive().default(8),
  slaMediumHours: z.number().int().positive().default(24),
  slaLowHours: z.number().int().positive().default(72),
  isActive: z.boolean().optional(),
})

categories.post('/', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { role, divisionId } = c.get('user')
  const body = catSchema.parse(await c.req.json())
  if (role === 'division_admin' && body.divisionId !== divisionId) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return c.json(await prisma.category.create({ data: body }), 201)
})

categories.patch('/:id', requireAuth('super_admin', 'division_admin'), async (c) => {
  const body = catSchema.partial().parse(await c.req.json())
  return c.json(await prisma.category.update({ where: { id: c.req.param('id') }, data: body }))
})

export default categories

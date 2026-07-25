import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { prisma } from '../_lib/prisma.js'
import { requireAuth } from '../_lib/auth.js'
import { z } from 'zod'

const divisions = new Hono()

divisions.get('/', requireAuth(), async (c) => {
  return c.json(
    await prisma.division.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, categories: true, tickets: true } },
      },
    })
  )
})

const divSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).max(10).toUpperCase(),
  accountMode: z.enum(['INDIVIDUAL', 'SHARED']).optional(),
})

divisions.post('/', requireAuth('super_admin'), async (c) => {
  const body = divSchema.parse(await c.req.json())
  return c.json(await prisma.division.create({ data: body }), 201)
})

divisions.patch('/:id', requireAuth('super_admin'), async (c) => {
  const body = divSchema.partial().parse(await c.req.json())
  return c.json(await prisma.division.update({ where: { id: c.req.param('id') }, data: body }))
})

// Toggle account mode — atomic transaction
const toggleSchema = z.object({ accountMode: z.enum(['INDIVIDUAL', 'SHARED']) })

divisions.patch('/:id/account-mode', requireAuth('super_admin'), async (c) => {
  const { accountMode } = toggleSchema.parse(await c.req.json())
  const divisionId = c.req.param('id')

  const result = await prisma.$transaction(async (tx) => {
    const division = await tx.division.update({
      where: { id: divisionId },
      data: { accountMode },
    })

    if (accountMode === 'SHARED') {
      // disable all individual requester accounts in this division
      await tx.user.updateMany({
        where: { divisionId, role: 'requester', isSharedAccount: false },
        data: { isActive: false },
      })
      // create shared account if none exists
      const existing = await tx.user.findFirst({ where: { divisionId, isSharedAccount: true } })
      if (!existing) {
        await tx.user.create({
          data: {
            name: `${division.name} Shared`,
            email: `shared-${division.code.toLowerCase()}@internal`,
            passwordHash: bcrypt.hashSync(division.code.toLowerCase(), 10),
            role: 'requester',
            divisionId,
            isSharedAccount: true,
            isActive: true,
          },
        })
      } else {
        await tx.user.update({ where: { id: existing.id }, data: { isActive: true } })
      }
    } else {
      // disable shared account
      await tx.user.updateMany({
        where: { divisionId, isSharedAccount: true },
        data: { isActive: false },
      })
    }

    return division
  })

  return c.json(result)
})

export default divisions

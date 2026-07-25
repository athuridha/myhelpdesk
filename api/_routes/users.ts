import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { prisma } from '../_lib/prisma.js'
import { requireAuth, JwtPayload } from '../_lib/auth.js'
import { z } from 'zod'

const users = new Hono()

users.get('/', requireAuth('super_admin', 'division_admin'), async (c) => {
  const user = c.get('user') as JwtPayload
  const { role, divisionId } = user
  const where = role === 'super_admin' ? {} : { divisionId: divisionId ?? '' }
  return c.json(
    await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        divisionId: true,
        isActive: true,
        isSharedAccount: true,
        division: { select: { id: true, name: true, code: true } },
      },
    })
  )
})

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['super_admin', 'division_admin', 'agent', 'requester']),
  divisionId: z.string().nullable().optional(),
})

users.post('/', requireAuth('super_admin', 'division_admin'), async (c) => {
  const user = c.get('user') as JwtPayload
  const { role: actorRole, divisionId: actorDiv } = user
  const body = createSchema.parse(await c.req.json())

  const targetDiv = body.divisionId || (actorRole === 'division_admin' ? actorDiv : undefined)

  if (actorRole === 'division_admin' && targetDiv !== actorDiv) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    return c.json({ error: 'Email sudah terdaftar' }, 400)
  }

  const passwordHash = bcrypt.hashSync(body.password, 10)
  const newUser = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: body.role,
      divisionId: targetDiv || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      divisionId: true,
      isActive: true,
      isSharedAccount: true,
      division: { select: { id: true, name: true, code: true } },
    },
  })
  return c.json(newUser, 201)
})

const updateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['super_admin', 'division_admin', 'agent', 'requester']).optional(),
  divisionId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

users.patch('/:id', requireAuth('super_admin', 'division_admin'), async (c) => {
  const user = c.get('user') as JwtPayload
  const { role: actorRole, divisionId: actorDiv } = user
  const targetUser = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!targetUser) return c.json({ error: 'User tidak ditemukan' }, 404)

  if (actorRole === 'division_admin' && targetUser.divisionId !== actorDiv) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const body = updateSchema.parse(await c.req.json())
  const updated = await prisma.user.update({
    where: { id: targetUser.id },
    data: body,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      divisionId: true,
      isActive: true,
      isSharedAccount: true,
      division: { select: { id: true, name: true, code: true } },
    },
  })
  return c.json(updated)
})

users.patch('/:id/toggle-active', requireAuth('super_admin', 'division_admin'), async (c) => {
  const user = c.get('user') as JwtPayload
  const { role: actorRole, divisionId: actorDiv } = user
  const targetUser = await prisma.user.findUnique({ where: { id: c.req.param('id') } })
  if (!targetUser) return c.json({ error: 'User tidak ditemukan' }, 404)

  if (actorRole === 'division_admin' && targetUser.divisionId !== actorDiv) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  return c.json(await prisma.user.update({ where: { id: targetUser.id }, data: { isActive: !targetUser.isActive } }))
})

export default users

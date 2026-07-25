import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { prisma } from '../_lib/prisma'
import { signToken, requireAuth } from '../_lib/auth'
import { z } from 'zod'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

auth.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400)
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { division: { select: { id: true, name: true, code: true } } },
  })
  if (!user || !user.isActive) {
    return c.json({ error: 'Email atau password salah / akun tidak aktif' }, 401)
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) {
    return c.json({ error: 'Email atau password salah' }, 401)
  }

  const token = signToken({
    userId: user.id,
    role: user.role,
    divisionId: user.divisionId,
    isImpersonating: false,
  })
  c.header('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)

  return c.json({
    token,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    divisionId: user.divisionId,
    division: user.division,
    isSharedAccount: user.isSharedAccount,
    isImpersonating: false,
  })
})

auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

auth.get('/me', requireAuth(), async (c) => {
  const payload = c.get('user')
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
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
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({
    ...user,
    isImpersonating: Boolean(payload.isImpersonating),
    originalSuperAdminId: payload.originalSuperAdminId || null,
  })
})

const switchSchema = z.object({ targetUserId: z.string() })

auth.post('/switch-user', requireAuth(), async (c) => {
  const payload = c.get('user')
  const actor = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!actor) return c.json({ error: 'User not found' }, 404)

  const isAllowedToSwitch =
    actor.role === 'super_admin' ||
    payload.role === 'super_admin' ||
    Boolean(payload.isImpersonating) ||
    Boolean(payload.originalSuperAdminId)

  if (!isAllowedToSwitch) {
    return c.json({ error: 'Fitur beralih profil hanya tersedia untuk Super Admin' }, 403)
  }

  const { targetUserId } = switchSchema.parse(await c.req.json())
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { division: { select: { id: true, name: true, code: true } } },
  })

  if (!targetUser || !targetUser.isActive) {
    return c.json({ error: 'Akun tujuan tidak ditemukan atau tidak aktif' }, 404)
  }

  const isTargetSuperAdmin = targetUser.role === 'super_admin'
  const newToken = signToken({
    userId: targetUser.id,
    role: targetUser.role,
    divisionId: targetUser.divisionId,
    isImpersonating: !isTargetSuperAdmin,
    originalSuperAdminId: isTargetSuperAdmin
      ? undefined
      : payload.originalSuperAdminId || (actor.role === 'super_admin' ? actor.id : undefined),
  })

  c.header('Set-Cookie', `token=${newToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)

  return c.json({
    token: newToken,
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: targetUser.role,
    divisionId: targetUser.divisionId,
    division: targetUser.division,
    isSharedAccount: targetUser.isSharedAccount,
    isImpersonating: !isTargetSuperAdmin,
  })
})

export default auth

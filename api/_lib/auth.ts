import jwt from 'jsonwebtoken'
import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-helpdesk-2026'

export interface JwtPayload {
  userId: string
  role: string
  divisionId?: string | null
  isImpersonating?: boolean
  originalSuperAdminId?: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

export function requireAuth(...allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    let token: string | undefined

    const authHeader = c.req.header('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      token = getCookie(c, 'token')
    }

    if (!token) {
      return c.json({ error: 'Unauthorized — Token tidak ditemukan' }, 401)
    }

    const payload = verifyToken(token)
    if (!payload) {
      return c.json({ error: 'Unauthorized — Token tidak valid / kedaluwarsa' }, 401)
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
      return c.json({ error: 'Forbidden — Anda tidak memiliki akses ke resource ini' }, 403)
    }

    c.set('user', payload)
    await next()
  }
}

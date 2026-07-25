import jwt from 'jsonwebtoken'
import type { Context } from 'hono'

export interface JwtPayload {
  userId: string
  role: string
  divisionId: string | null
  isImpersonating?: boolean
  originalSuperAdminId?: string
}

const SECRET = process.env.JWT_SECRET || 'super-secret-helpdesk-jwt-key-2026'

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function getTokenFromRequest(c: Context): string | null {
  // 1. Try Cookie header
  const header = c.req.header('cookie') ?? ''
  const match = header.match(/(?:^|;\s*)token=([^;]*)/)
  if (match) return decodeURIComponent(match[1])

  // 2. Try Authorization header
  const authHeader = c.req.header('authorization') ?? ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }

  return null
}

export function requireAuth(...roles: string[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const token = getTokenFromRequest(c)
    if (!token) return c.json({ error: 'Unauthorized' }, 401)
    try {
      const payload = verifyToken(token)
      if (roles.length && !roles.includes(payload.role)) {
        return c.json({ error: 'Forbidden' }, 403)
      }
      c.set('user', payload)
      await next()
    } catch {
      return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401)
    }
  }
}

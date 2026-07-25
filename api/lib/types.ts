import type { JwtPayload } from './auth'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

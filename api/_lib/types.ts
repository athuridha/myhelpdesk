import { Context } from 'hono'
import { JwtPayload } from './auth'

declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload
  }
}

export type AppContext = Context<{
  Variables: {
    user: JwtPayload
  }
}>

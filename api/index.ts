import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import auth from './routes/auth'
import divisions from './routes/divisions'
import categories from './routes/categories'
import formFields from './routes/form-fields'
import tickets from './routes/tickets'
import notifications from './routes/notifications'
import users from './routes/users'
import settings from './routes/settings'

export const config = { runtime: 'nodejs20.x' }

const app = new Hono().basePath('/api')

// Enable CORS
app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
)

// Global Error Handler
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({ error: 'Validation error', details: err.issues }, 400)
  }
  console.error('API Error:', err)
  return c.json(
    { error: err.message || 'Internal Server Error' },
    500
  )
})

// 404 Handler for API routes
app.notFound((c) => {
  return c.json({ error: 'API route not found' }, 404)
})

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))
app.route('/auth', auth)
app.route('/divisions', divisions)
app.route('/categories', categories)
app.route('/categories', formFields)
app.route('/tickets', tickets)
app.route('/notifications', notifications)
app.route('/users', users)
app.route('/settings', settings)

export default app

# Helpdesk Multi-Departemen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-tenant multi-department internal helpdesk web app with toggle-able account modes, drag-and-drop Form Builder, dynamic ticket forms, List + Board views, SLA engine, and in-app notifications.

**Architecture:** One Vite project deployed to Vercel. React SPA at root (FE), `/api` folder holds Vercel Serverless Functions with a single Hono router at `/api/index.ts` (avoids multi-function cold starts). Prisma v5 Client talks to PostgreSQL (Neon, pooled connection). Vercel Blob for attachments. Auth is custom JWT in httpOnly cookie with 4-role RBAC. No WebSockets — TanStack Query polling (~15s).

**Tech Stack:** Vite 5 + React 18 + TS, Tailwind + shadcn/ui, TanStack Query v5, Zustand, React Hook Form + Zod, dnd-kit, Recharts, Hono, Prisma v5, jsonwebtoken, bcryptjs, PostgreSQL.

## Global Constraints

- Single-tenant deployment (one office per instance).
- Account mode (`INDIVIDUAL`/`SHARED`) is per-Division, toggled by Super Admin. Shared applies only to Requester side; Agent/Admin always individual.
- `id` fields use `cuid()` (Prisma default).
- All multi-table mutations wrapped in `prisma.$transaction`.
- Ticket number format `{DIVISION_CODE}-{YEAR}-{SEQ}` (e.g. `IT-2026-0001`), generated server-side inside the create transaction.
- Overdue = status not Selesai/Ditutup AND `now > dueDate`.
- File uploads validated type+size on client AND server.
- Pooled DB connection string from day one (`?pgbouncer=true`).
- Env vars: `DATABASE_URL` (pooled), `DIRECT_URL` (migrations), `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`.
- Field types: Short Text, Paragraph, Dropdown, Radio, Checkboxes, Date, Number, File Upload.
- Roles: `super_admin`, `division_admin`, `agent`, `requester`.
- Ticket statuses: `BARU`, `DITUGASKAN`, `SEDANG_DIKERJAKAN`, `MENUNGGU_USER`, `SELESAI`, `DITUTUP`, `SPAM`, `TRASH`.
- Priorities: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.

---

## File Map

```
vite-project/
├── api/
│   └── index.ts                  # Hono router — single entry for all /api/* routes
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   ├── api.ts                # typed fetch wrapper
│   │   ├── auth.ts               # token helpers (client-side)
│   │   └── utils.ts              # cn(), formatDate(), etc.
│   ├── store/
│   │   └── ui.ts                 # Zustand: viewMode, activeFilters
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTickets.ts
│   │   └── useNotifications.ts
│   ├── components/
│   │   ├── ui/                   # shadcn/ui generated components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── tickets/
│   │   │   ├── ListView.tsx
│   │   │   ├── BoardView.tsx
│   │   │   ├── TicketCard.tsx
│   │   │   ├── TicketDetail.tsx
│   │   │   └── TicketForm.tsx    # dynamic form renderer
│   │   ├── form-builder/
│   │   │   └── FormBuilder.tsx
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx
│   │   └── notifications/
│   │       └── NotificationBell.tsx
│   └── pages/
│       ├── LoginPage.tsx
│       ├── TicketsPage.tsx
│       ├── TicketDetailPage.tsx
│       ├── NewTicketPage.tsx
│       ├── AdminPage.tsx
│       └── DashboardPage.tsx
├── vercel.json
├── .env.example
└── package.json
```

---

---

### Task 1: Project Scaffold & Tooling

**Files:**
- Modify: `package.json`
- Create: `vercel.json`
- Create: `.env.example`
- Create: `api/index.ts` (stub)
- Create: `prisma/schema.prisma` (stub)
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: running `vercel dev` serves React SPA on `/` and Hono on `/api/*`

- [ ] **Step 1: Install all dependencies**

```bash
cd vite-project
npm install hono @hono/node-server @prisma/client @vercel/blob jsonwebtoken bcryptjs zod
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install recharts react-router-dom
npm install -D prisma @types/jsonwebtoken @types/bcryptjs tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Init Tailwind**

```bash
npx tailwindcss init -p
```

Then update `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
```

- [ ] **Step 3: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL=postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://user:pass@host/db
JWT_SECRET=change_me_32_chars_minimum
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

- [ ] **Step 5: Create `api/index.ts` stub**

```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'

export const config = { runtime: 'nodejs20.x' }

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ ok: true }))

export default handle(app)
```

- [ ] **Step 6: Init Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 7: Verify dev server starts**

```bash
vercel dev
```

Expected: `http://localhost:3000` serves Vite React page; `http://localhost:3000/api/health` returns `{"ok":true}`.

- [ ] **Step 8: Commit**

```bash
git init
git add -A
git commit -m "feat: project scaffold — Vite+React+Hono+Prisma+Tailwind"
```

---

### Task 2: Prisma Schema & Seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json` (add seed script)

**Interfaces:**
- Produces: all DB tables; `prisma/seed.ts` populates 3 divisions, sample categories, form fields, and one user per role

- [ ] **Step 1: Write full `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Division {
  id          String   @id @default(cuid())
  name        String
  code        String   @unique
  accountMode String   @default("INDIVIDUAL")
  createdAt   DateTime @default(now())
  users       User[]
  categories  Category[]
  tickets     Ticket[]
}

model User {
  id              String   @id @default(cuid())
  name            String
  email           String   @unique
  passwordHash    String
  role            String
  divisionId      String?
  isSharedAccount Boolean  @default(false)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  division        Division? @relation(fields: [divisionId], references: [id])
  requestedTickets  Ticket[] @relation("requester")
  assignedTickets   Ticket[] @relation("assignee")
  comments        TicketComment[]
  activityLogs    TicketActivityLog[]
  notifications   Notification[]
  attachments     TicketAttachment[]
}

model Category {
  id               String   @id @default(cuid())
  name             String
  divisionId       String
  slaCriticalHours Int      @default(4)
  slaHighHours     Int      @default(8)
  slaMediumHours   Int      @default(24)
  slaLowHours      Int      @default(72)
  isActive         Boolean  @default(true)
  division         Division @relation(fields: [divisionId], references: [id])
  formFields       FormField[]
  tickets          Ticket[]
}

model FormField {
  id         String   @id @default(cuid())
  categoryId String
  label      String
  fieldType  String
  options    Json?
  isRequired Boolean  @default(false)
  order      Int
  category   Category @relation(fields: [categoryId], references: [id])
  fieldValues TicketFieldValue[]
}

model Ticket {
  id           String   @id @default(cuid())
  ticketNumber String   @unique
  subject      String
  categoryId   String
  divisionId   String
  requesterId  String
  assigneeId   String?
  priority     String   @default("MEDIUM")
  status       String   @default("BARU")
  channel      String   @default("WEB")
  dueDate      DateTime?
  resolvedAt   DateTime?
  closedAt     DateTime?
  createdAt    DateTime @default(now())
  category     Category @relation(fields: [categoryId], references: [id])
  division     Division @relation(fields: [divisionId], references: [id])
  requester    User     @relation("requester", fields: [requesterId], references: [id])
  assignee     User?    @relation("assignee", fields: [assigneeId], references: [id])
  fieldValues  TicketFieldValue[]
  comments     TicketComment[]
  attachments  TicketAttachment[]
  activityLogs TicketActivityLog[]
  notifications Notification[]
}

model TicketFieldValue {
  id          String    @id @default(cuid())
  ticketId    String
  formFieldId String
  value       String
  ticket      Ticket    @relation(fields: [ticketId], references: [id])
  formField   FormField @relation(fields: [formFieldId], references: [id])
}

model TicketComment {
  id             String   @id @default(cuid())
  ticketId       String
  authorId       String
  content        String
  isInternalNote Boolean  @default(false)
  createdAt      DateTime @default(now())
  ticket         Ticket   @relation(fields: [ticketId], references: [id])
  author         User     @relation(fields: [authorId], references: [id])
  attachments    TicketAttachment[]
}

model TicketAttachment {
  id           String        @id @default(cuid())
  ticketId     String
  commentId    String?
  fileUrl      String
  fileName     String
  uploadedById String
  ticket       Ticket        @relation(fields: [ticketId], references: [id])
  comment      TicketComment? @relation(fields: [commentId], references: [id])
  uploadedBy   User          @relation(fields: [uploadedById], references: [id])
}

model TicketActivityLog {
  id        String   @id @default(cuid())
  ticketId  String
  actorId   String
  action    String
  fromValue String?
  toValue   String?
  createdAt DateTime @default(now())
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  actor     User     @relation(fields: [actorId], references: [id])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  ticketId  String?
  type      String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  ticket    Ticket?  @relation(fields: [ticketId], references: [id])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: migration file created, tables created in DB.

- [ ] **Step 3: Write `prisma/seed.ts`**

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = (p: string) => bcrypt.hashSync(p, 10)

  const it = await prisma.division.create({
    data: { name: 'IT', code: 'IT', accountMode: 'INDIVIDUAL' },
  })
  const hr = await prisma.division.create({
    data: { name: 'HR', code: 'HR', accountMode: 'INDIVIDUAL' },
  })
  const ga = await prisma.division.create({
    data: { name: 'GA', code: 'GA', accountMode: 'SHARED' },
  })

  await prisma.user.create({
    data: { name: 'Super Admin', email: 'super@demo.com', passwordHash: hash('password'), role: 'super_admin' },
  })
  const itAdmin = await prisma.user.create({
    data: { name: 'IT Admin', email: 'itadmin@demo.com', passwordHash: hash('password'), role: 'division_admin', divisionId: it.id },
  })
  await prisma.user.create({
    data: { name: 'IT Agent', email: 'itagent@demo.com', passwordHash: hash('password'), role: 'agent', divisionId: it.id },
  })
  await prisma.user.create({
    data: { name: 'Budi Santoso', email: 'budi@demo.com', passwordHash: hash('password'), role: 'requester', divisionId: it.id },
  })
  await prisma.user.create({
    data: { name: 'GA Shared', email: 'ga@demo.com', passwordHash: hash('password'), role: 'requester', divisionId: ga.id, isSharedAccount: true },
  })

  const cat = await prisma.category.create({
    data: { name: 'Kerusakan Hardware', divisionId: it.id, slaCriticalHours: 4, slaHighHours: 8, slaMediumHours: 24, slaLowHours: 72 },
  })
  await prisma.formField.createMany({
    data: [
      { categoryId: cat.id, label: 'Nama Perangkat', fieldType: 'SHORT_TEXT', isRequired: true, order: 1 },
      { categoryId: cat.id, label: 'Deskripsi Masalah', fieldType: 'PARAGRAPH', isRequired: true, order: 2 },
      { categoryId: cat.id, label: 'Lokasi', fieldType: 'DROPDOWN', options: ['Lantai 1','Lantai 2','Lantai 3'], isRequired: true, order: 3 },
      { categoryId: cat.id, label: 'Tanggal Kejadian', fieldType: 'DATE', isRequired: false, order: 4 },
      { categoryId: cat.id, label: 'Foto Kerusakan', fieldType: 'FILE_UPLOAD', isRequired: false, order: 5 },
    ],
  })

  const hrCat = await prisma.category.create({
    data: { name: 'Pengajuan Cuti', divisionId: hr.id, slaCriticalHours: 8, slaHighHours: 24, slaMediumHours: 48, slaLowHours: 120 },
  })
  await prisma.formField.createMany({
    data: [
      { categoryId: hrCat.id, label: 'Jenis Cuti', fieldType: 'RADIO', options: ['Cuti Tahunan','Cuti Sakit','Cuti Melahirkan'], isRequired: true, order: 1 },
      { categoryId: hrCat.id, label: 'Tanggal Mulai', fieldType: 'DATE', isRequired: true, order: 2 },
      { categoryId: hrCat.id, label: 'Tanggal Selesai', fieldType: 'DATE', isRequired: true, order: 3 },
      { categoryId: hrCat.id, label: 'Alasan', fieldType: 'PARAGRAPH', isRequired: true, order: 4 },
    ],
  })
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Add seed script to `package.json`**

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

Also install `tsx`:

```bash
npm install -D tsx
```

- [ ] **Step 5: Run seed**

```bash
npx prisma db seed
```

Expected: no errors; `npx prisma studio` shows populated tables.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: prisma schema + seed data (3 divisions, categories, users)"
```

---

### Task 3: Auth — JWT + RBAC Middleware

**Files:**
- Create: `api/lib/prisma.ts`
- Create: `api/lib/auth.ts`
- Create: `api/routes/auth.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Produces: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Produces: `requireAuth(roles[])` middleware for all protected routes
- Produces: `JwtPayload { userId, role, divisionId }`

- [ ] **Step 1: Create `api/lib/prisma.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 2: Create `api/lib/auth.ts`**

```ts
import jwt from 'jsonwebtoken'
import type { Context } from 'hono'

export interface JwtPayload {
  userId: string
  role: string
  divisionId: string | null
}

const SECRET = process.env.JWT_SECRET!

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function requireAuth(...roles: string[]) {
  return async (c: Context, next: () => Promise<void>) => {
    const token = getCookie(c, 'token')
    if (!token) return c.json({ error: 'Unauthorized' }, 401)
    try {
      const payload = verifyToken(token)
      if (roles.length && !roles.includes(payload.role))
        return c.json({ error: 'Forbidden' }, 403)
      c.set('user', payload)
      await next()
    } catch {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }
}

function getCookie(c: Context, name: string) {
  const header = c.req.header('cookie') ?? ''
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}
```

- [ ] **Step 3: Create `api/routes/auth.ts`**

```ts
import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { signToken, requireAuth } from '../lib/auth'
import { z } from 'zod'

const auth = new Hono()

const loginSchema = z.object({ email: z.string().email(), password: z.string() })

auth.post('/login', async (c) => {
  const body = await c.req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Invalid input' }, 400)

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || !user.isActive) return c.json({ error: 'Invalid credentials' }, 401)

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

  const token = signToken({ userId: user.id, role: user.role, divisionId: user.divisionId })
  c.header('Set-Cookie', `token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
  return c.json({ id: user.id, name: user.name, email: user.email, role: user.role, divisionId: user.divisionId })
})

auth.post('/logout', (c) => {
  c.header('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

auth.get('/me', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, divisionId: true, division: { select: { name: true, code: true } } },
  })
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})

export default auth
```

- [ ] **Step 4: Wire into `api/index.ts`**

```ts
import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import auth from './routes/auth'

export const config = { runtime: 'nodejs20.x' }

const app = new Hono().basePath('/api')

app.get('/health', (c) => c.json({ ok: true }))
app.route('/auth', auth)

export default handle(app)
```

- [ ] **Step 5: Test login manually**

```bash
vercel dev
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"super@demo.com","password":"password"}'
```

Expected: JSON with user object and `Set-Cookie: token=...` header.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: JWT auth + RBAC middleware (login/logout/me)"
```

---

### Task 4: Division & Category CRUD API

**Files:**
- Create: `api/routes/divisions.ts`
- Create: `api/routes/categories.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Produces: `GET/POST /api/divisions`, `GET/PATCH /api/divisions/:id`
- Produces: `GET/POST /api/categories`, `GET/PATCH/DELETE /api/categories/:id`
- Produces: `GET /api/categories/:id/form-schema` (returns `FormField[]`)

- [ ] **Step 1: Create `api/routes/divisions.ts`**

```ts
import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const divisions = new Hono()

divisions.get('/', requireAuth(), async (c) => {
  const { role, divisionId } = c.get('user')
  const where = role === 'super_admin' ? {} : { id: divisionId ?? '' }
  return c.json(await prisma.division.findMany({ where }))
})

const divSchema = z.object({ name: z.string().min(1), code: z.string().min(1).max(10).toUpperCase() })

divisions.post('/', requireAuth('super_admin'), async (c) => {
  const body = divSchema.parse(await c.req.json())
  return c.json(await prisma.division.create({ data: body }), 201)
})

divisions.patch('/:id', requireAuth('super_admin'), async (c) => {
  const body = divSchema.partial().parse(await c.req.json())
  return c.json(await prisma.division.update({ where: { id: c.req.param('id') }, data: body }))
})

export default divisions
```

- [ ] **Step 2: Create `api/routes/categories.ts`**

```ts
import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const categories = new Hono()

categories.get('/', requireAuth(), async (c) => {
  const { role, divisionId } = c.get('user')
  const where = role === 'super_admin' ? {} : { divisionId: divisionId ?? '' }
  return c.json(await prisma.category.findMany({ where, include: { division: { select: { name: true, code: true } } } }))
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
})

categories.post('/', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { role, divisionId } = c.get('user')
  const body = catSchema.parse(await c.req.json())
  if (role === 'division_admin' && body.divisionId !== divisionId)
    return c.json({ error: 'Forbidden' }, 403)
  return c.json(await prisma.category.create({ data: body }), 201)
})

categories.patch('/:id', requireAuth('super_admin', 'division_admin'), async (c) => {
  const body = catSchema.partial().parse(await c.req.json())
  return c.json(await prisma.category.update({ where: { id: c.req.param('id') }, data: body }))
})

export default categories
```

- [ ] **Step 3: Register routes in `api/index.ts`**

```ts
import divisions from './routes/divisions'
import categories from './routes/categories'
// ...existing imports...
app.route('/divisions', divisions)
app.route('/categories', categories)
```

- [ ] **Step 4: Test**

```bash
# get token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"super@demo.com","password":"password"}' \
  -c /tmp/cookies.txt && cat /tmp/cookies.txt | grep token | awk '{print $7}')

curl http://localhost:3000/api/divisions -H "Cookie: token=$TOKEN"
curl http://localhost:3000/api/categories -H "Cookie: token=$TOKEN"
```

Expected: JSON arrays of divisions and categories.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: division + category CRUD API"
```

---

### Task 5: Form Builder API + UI

**Files:**
- Create: `api/routes/form-fields.ts`
- Modify: `api/index.ts`
- Create: `src/components/form-builder/FormBuilder.tsx`

**Interfaces:**
- Consumes: `GET /api/categories/:id/form-schema` → `FormField[]`
- Produces: `PUT /api/categories/:id/form-schema` (replace all fields atomically)
- Produces: `<FormBuilder categoryId={string} />` component

- [ ] **Step 1: Create `api/routes/form-fields.ts`**

```ts
import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const formFields = new Hono()

const fieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  fieldType: z.enum(['SHORT_TEXT','PARAGRAPH','DROPDOWN','RADIO','CHECKBOXES','DATE','NUMBER','FILE_UPLOAD']),
  options: z.array(z.string()).optional().nullable(),
  isRequired: z.boolean().default(false),
  order: z.number().int(),
})

// PUT replaces all fields for a category atomically
formFields.put('/:categoryId/form-schema', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { categoryId } = c.req.param()
  const fields = z.array(fieldSchema).parse(await c.req.json())

  // validate unique labels within category
  const labels = fields.map(f => f.label)
  if (new Set(labels).size !== labels.length)
    return c.json({ error: 'Duplicate field labels' }, 400)

  const result = await prisma.$transaction(async (tx) => {
    await tx.formField.deleteMany({ where: { categoryId } })
    return tx.formField.createMany({
      data: fields.map((f, i) => ({
        categoryId,
        label: f.label,
        fieldType: f.fieldType,
        options: f.options ?? undefined,
        isRequired: f.isRequired,
        order: i + 1,
      })),
    })
  })
  return c.json(result)
})

export default formFields
```

- [ ] **Step 2: Register in `api/index.ts`**

```ts
import formFields from './routes/form-fields'
app.route('/categories', formFields)  // mounts as /api/categories/:categoryId/form-schema
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
# choose: TypeScript, Default style, Slate base color, src/components/ui
npx shadcn@latest add button input label select card badge dialog
```

- [ ] **Step 4: Create `src/components/form-builder/FormBuilder.tsx`**

```tsx
import { useState, useCallback } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const FIELD_TYPES = ['SHORT_TEXT','PARAGRAPH','DROPDOWN','RADIO','CHECKBOXES','DATE','NUMBER','FILE_UPLOAD'] as const
type FieldType = typeof FIELD_TYPES[number]

interface Field { tempId: string; label: string; fieldType: FieldType; isRequired: boolean; options: string[] }

function SortableField({ field, onChange, onRemove }: {
  field: Field
  onChange: (f: Field) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.tempId })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const hasOptions = ['DROPDOWN','RADIO','CHECKBOXES'].includes(field.fieldType)

  return (
    <div ref={setNodeRef} style={style} className="border rounded p-3 bg-white space-y-2">
      <div className="flex gap-2 items-center">
        <span {...attributes} {...listeners} className="cursor-grab text-gray-400">⠿</span>
        <Input value={field.label} onChange={e => onChange({ ...field, label: e.target.value })} placeholder="Field label" className="flex-1" />
        <Select value={field.fieldType} onValueChange={v => onChange({ ...field, fieldType: v as FieldType })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={field.isRequired} onChange={e => onChange({ ...field, isRequired: e.target.checked })} />
          Required
        </label>
        <Button variant="ghost" size="sm" onClick={onRemove}>✕</Button>
      </div>
      {hasOptions && (
        <div className="pl-6 space-y-1">
          {field.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <Input value={opt} onChange={e => {
                const opts = [...field.options]; opts[i] = e.target.value
                onChange({ ...field, options: opts })
              }} placeholder={`Option ${i + 1}`} className="flex-1" />
              <Button variant="ghost" size="sm" onClick={() => onChange({ ...field, options: field.options.filter((_, j) => j !== i) })}>✕</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...field, options: [...field.options, ''] })}>+ Add option</Button>
        </div>
      )}
    </div>
  )
}

export function FormBuilder({ categoryId, initialFields = [], onSave }: {
  categoryId: string
  initialFields?: Field[]
  onSave?: () => void
}) {
  const [fields, setFields] = useState<Field[]>(initialFields)
  const [saving, setSaving] = useState(false)

  const addField = () => setFields(f => [...f, { tempId: crypto.randomUUID(), label: '', fieldType: 'SHORT_TEXT', isRequired: false, options: [] }])

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (over && active.id !== over.id) {
      setFields(f => {
        const from = f.findIndex(x => x.tempId === active.id)
        const to = f.findIndex(x => x.tempId === over.id)
        return arrayMove(f, from, to)
      })
    }
  }

  const save = async () => {
    setSaving(true)
    await fetch(`/api/categories/${categoryId}/form-schema`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields.map((f, i) => ({ ...f, order: i + 1 }))),
    })
    setSaving(false)
    onSave?.()
  }

  return (
    <div className="space-y-3">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map(f => f.tempId)} strategy={verticalListSortingStrategy}>
          {fields.map(f => (
            <SortableField key={f.tempId} field={f}
              onChange={updated => setFields(fs => fs.map(x => x.tempId === f.tempId ? updated : x))}
              onRemove={() => setFields(fs => fs.filter(x => x.tempId !== f.tempId))}
            />
          ))}
        </SortableContext>
      </DndContext>
      <div className="flex gap-2">
        <Button variant="outline" onClick={addField}>+ Add Field</Button>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Form'}</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: form builder API + drag-drop UI component"
```

---

### Task 6: Ticket Submission API + SLA Engine

**Files:**
- Create: `api/lib/sla.ts`
- Create: `api/routes/tickets.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Produces: `POST /api/tickets` — creates ticket + field values + calculates dueDate in one transaction
- Produces: `GET /api/tickets` — list with RBAC filter
- Produces: `GET /api/tickets/:id` — full detail
- Produces: `PATCH /api/tickets/:id` — update status/assignee/priority
- Produces: `calculateDueDate(priority, category): Date`

- [ ] **Step 1: Create `api/lib/sla.ts`**

```ts
interface SlaCategory {
  slaCriticalHours: number
  slaHighHours: number
  slaMediumHours: number
  slaLowHours: number
}

export function calculateDueDate(priority: string, category: SlaCategory): Date {
  const hoursMap: Record<string, number> = {
    CRITICAL: category.slaCriticalHours,
    HIGH: category.slaHighHours,
    MEDIUM: category.slaMediumHours,
    LOW: category.slaLowHours,
  }
  const hours = hoursMap[priority] ?? category.slaMediumHours
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export function isOverdue(ticket: { status: string; dueDate: Date | null }): boolean {
  if (!ticket.dueDate) return false
  if (['SELESAI', 'DITUTUP', 'SPAM', 'TRASH'].includes(ticket.status)) return false
  return new Date() > ticket.dueDate
}
```

- [ ] **Step 2: Create `api/routes/tickets.ts`**

```ts
import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import { calculateDueDate } from '../lib/sla'
import { z } from 'zod'

const tickets = new Hono()

// GET /api/tickets — RBAC-filtered list
tickets.get('/', requireAuth(), async (c) => {
  const { userId, role, divisionId } = c.get('user')
  const { status, priority, search, divisionId: qDiv } = c.req.query()

  const where: Record<string, unknown> = {}
  if (role === 'requester') where.requesterId = userId
  else if (role === 'agent') where.divisionId = divisionId
  else if (role === 'division_admin') where.divisionId = divisionId
  // super_admin: no filter
  if (qDiv && role === 'super_admin') where.divisionId = qDiv
  if (status) where.status = status
  if (priority) where.priority = priority
  if (search) where.subject = { contains: search, mode: 'insensitive' }

  const list = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      category: { select: { name: true } },
      division: { select: { name: true, code: true } },
    },
  })
  return c.json(list)
})

// GET /api/tickets/:id
tickets.get('/:id', requireAuth(), async (c) => {
  const { userId, role, divisionId } = c.get('user')
  const ticket = await prisma.ticket.findUnique({
    where: { id: c.req.param('id') },
    include: {
      requester: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      category: true,
      division: { select: { name: true, code: true } },
      fieldValues: { include: { formField: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: true,
      activityLogs: { include: { actor: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!ticket) return c.json({ error: 'Not found' }, 404)
  if (role === 'requester' && ticket.requesterId !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (role === 'agent' && ticket.divisionId !== divisionId) return c.json({ error: 'Forbidden' }, 403)
  if (role === 'division_admin' && ticket.divisionId !== divisionId) return c.json({ error: 'Forbidden' }, 403)

  // filter internal notes from requester
  if (role === 'requester') {
    ticket.comments = ticket.comments.filter(c => !c.isInternalNote)
  }
  return c.json(ticket)
})

const submitSchema = z.object({
  subject: z.string().min(1),
  categoryId: z.string(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  fieldValues: z.array(z.object({ formFieldId: z.string(), value: z.string() })),
})

// POST /api/tickets
tickets.post('/', requireAuth('requester', 'agent', 'division_admin', 'super_admin'), async (c) => {
  const { userId } = c.get('user')
  const body = submitSchema.parse(await c.req.json())

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
  if (!category) return c.json({ error: 'Category not found' }, 404)

  const dueDate = calculateDueDate(body.priority, category)

  // generate ticket number: {CODE}-{YEAR}-{SEQ}
  const year = new Date().getFullYear()
  const division = await prisma.division.findUnique({ where: { id: category.divisionId } })
  const prefix = `${division!.code}-${year}-`

  const ticket = await prisma.$transaction(async (tx) => {
    const count = await tx.ticket.count({
      where: { divisionId: category.divisionId, ticketNumber: { startsWith: prefix } },
    })
    const seq = String(count + 1).padStart(4, '0')
    const ticketNumber = `${prefix}${seq}`

    const t = await tx.ticket.create({
      data: {
        ticketNumber,
        subject: body.subject,
        categoryId: body.categoryId,
        divisionId: category.divisionId,
        requesterId: userId,
        priority: body.priority,
        dueDate,
        fieldValues: { create: body.fieldValues },
      },
    })

    await tx.ticketActivityLog.create({
      data: { ticketId: t.id, actorId: userId, action: 'CREATED', toValue: 'BARU' },
    })

    // notify agents in division
    const agents = await tx.user.findMany({
      where: { divisionId: category.divisionId, role: { in: ['agent', 'division_admin'] }, isActive: true },
      select: { id: true },
    })
    if (agents.length) {
      await tx.notification.createMany({
        data: agents.map(a => ({
          userId: a.id,
          ticketId: t.id,
          type: 'TICKET_CREATED',
          message: `Tiket baru: ${ticketNumber} — ${body.subject}`,
        })),
      })
    }
    return t
  })

  return c.json(ticket, 201)
})

const patchSchema = z.object({
  status: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
}).refine(d => Object.keys(d).length > 0, { message: 'No fields to update' })

// PATCH /api/tickets/:id
tickets.patch('/:id', requireAuth(), async (c) => {
  const { userId, role } = c.get('user')
  const body = patchSchema.parse(await c.req.json())
  const id = c.req.param('id')

  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Not found' }, 404)
  if (role === 'requester') return c.json({ error: 'Forbidden' }, 403)

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({ where: { id }, data: body })

    const logs = []
    if (body.status && body.status !== existing.status)
      logs.push({ ticketId: id, actorId: userId, action: 'STATUS_CHANGED', fromValue: existing.status, toValue: body.status })
    if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId)
      logs.push({ ticketId: id, actorId: userId, action: 'ASSIGNED', fromValue: existing.assigneeId ?? '', toValue: body.assigneeId ?? '' })

    if (logs.length) await tx.ticketActivityLog.createMany({ data: logs })

    // notify requester
    if (body.status) {
      await tx.notification.create({
        data: { userId: existing.requesterId, ticketId: id, type: 'STATUS_CHANGED', message: `Status tiket ${existing.ticketNumber} berubah ke ${body.status}` },
      })
    }
    return t
  })

  return c.json(updated)
})

export default tickets
```

- [ ] **Step 3: Register in `api/index.ts`**

```ts
import tickets from './routes/tickets'
app.route('/tickets', tickets)
```

- [ ] **Step 4: Test**

```bash
# login as requester
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"budi@demo.com","password":"password"}' -c /tmp/c.txt

# get category id
CAT=$(curl -s http://localhost:3000/api/categories -b /tmp/c.txt | jq -r '.[0].id')

# submit ticket
curl -X POST http://localhost:3000/api/tickets \
  -H 'Content-Type: application/json' -b /tmp/c.txt \
  -d "{\"subject\":\"Laptop mati\",\"categoryId\":\"$CAT\",\"priority\":\"HIGH\",\"fieldValues\":[]}"
```

Expected: `201` with `ticketNumber` like `IT-2026-0001`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ticket submission API + SLA engine + RBAC list/detail/patch"
```

---

### Task 7: Frontend Foundation — Router, Auth, Layout

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/lib/api.ts`
- Create: `src/lib/utils.ts`
- Create: `src/store/ui.ts`
- Create: `src/hooks/useAuth.ts`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/pages/LoginPage.tsx`

**Interfaces:**
- Produces: `apiFetch(path, init?)` — typed fetch with cookie
- Produces: `useAuth()` → `{ user, isLoading, login, logout }`
- Produces: `<AppLayout>` wrapping all authenticated pages
- Produces: React Router routes: `/login`, `/tickets`, `/tickets/:id`, `/new-ticket`, `/admin`, `/dashboard`

- [ ] **Step 1: Create `src/lib/api.ts`**

```ts
export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? res.statusText)
  }
  return res.json()
}
```

- [ ] **Step 2: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
```

Install deps:

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 3: Create `src/store/ui.ts`**

```ts
import { create } from 'zustand'

type ViewMode = 'list' | 'board'

interface UiStore {
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  activeFilters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilters: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  viewMode: 'list',
  setViewMode: (viewMode) => set({ viewMode }),
  activeFilters: {},
  setFilter: (key, value) => set(s => ({ activeFilters: { ...s.activeFilters, [key]: value } })),
  clearFilters: () => set({ activeFilters: {} }),
}))
```

- [ ] **Step 4: Create `src/hooks/useAuth.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

interface AuthUser { id: string; name: string; email: string; role: string; divisionId: string | null; division?: { name: string; code: string } }

export function useAuth() {
  const qc = useQueryClient()
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ['me'],
    queryFn: () => apiFetch<AuthUser>('/auth/me').catch(() => null),
    staleTime: 5 * 60 * 1000,
  })

  const login = useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      apiFetch<AuthUser>('/auth/login', { method: 'POST', body: JSON.stringify(creds) }),
    onSuccess: (data) => qc.setQueryData(['me'], data),
  })

  const logout = useMutation({
    mutationFn: () => apiFetch('/auth/logout', { method: 'POST' }),
    onSuccess: () => qc.setQueryData(['me'], null),
  })

  return { user, isLoading, login, logout }
}
```

- [ ] **Step 5: Create `src/components/layout/Sidebar.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const links = [
  { to: '/tickets', label: '🎫 Tiket', roles: ['super_admin','division_admin','agent','requester'] },
  { to: '/new-ticket', label: '➕ Buat Tiket', roles: ['requester','agent'] },
  { to: '/dashboard', label: '📊 Dashboard', roles: ['super_admin','division_admin','agent'] },
  { to: '/admin', label: '⚙️ Admin', roles: ['super_admin','division_admin'] },
]

export function Sidebar() {
  const { user } = useAuth()
  const visible = links.filter(l => user && l.roles.includes(user.role))

  return (
    <aside className="w-56 shrink-0 border-r bg-white h-screen flex flex-col">
      <div className="p-4 font-bold text-lg border-b">Helpdesk</div>
      <nav className="flex-1 p-2 space-y-1">
        {visible.map(l => (
          <NavLink key={l.to} to={l.to}
            className={({ isActive }) => cn('block px-3 py-2 rounded text-sm', isActive ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50')}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t text-xs text-gray-500">{user?.name} · {user?.role}</div>
    </aside>
  )
}
```

- [ ] **Step 6: Create `src/components/layout/TopBar.tsx`**

```tsx
import { useUiStore } from '@/store/ui'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export function TopBar({ title }: { title: string }) {
  const { viewMode, setViewMode } = useUiStore()
  const { logout } = useAuth()

  return (
    <header className="h-12 border-b flex items-center px-4 gap-3 bg-white">
      <span className="font-semibold flex-1">{title}</span>
      <Button size="sm" variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')}>List</Button>
      <Button size="sm" variant={viewMode === 'board' ? 'default' : 'outline'} onClick={() => setViewMode('board')}>Board</Button>
      <Button size="sm" variant="ghost" onClick={() => logout.mutate()}>Logout</Button>
    </header>
  )
}
```

- [ ] **Step 7: Create `src/pages/LoginPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login.mutateAsync({ email, password })
      navigate('/tickets')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-bold">Helpdesk Login</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 8: Wire `src/main.tsx` and `src/App.tsx`**

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const qc = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
```

`src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoginPage } from '@/pages/LoginPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'
import { NewTicketPage } from '@/pages/NewTicketPage'
import { AdminPage } from '@/pages/AdminPage'
import { DashboardPage } from '@/pages/DashboardPage'

function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-screen overflow-hidden"><Sidebar /><main className="flex-1 overflow-auto">{children}</main></div>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="p-8">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth><AppLayout><Navigate to="/tickets" replace /></AppLayout></RequireAuth>} />
      <Route path="/tickets" element={<RequireAuth><AppLayout><TicketsPage /></AppLayout></RequireAuth>} />
      <Route path="/tickets/:id" element={<RequireAuth><AppLayout><TicketDetailPage /></AppLayout></RequireAuth>} />
      <Route path="/new-ticket" element={<RequireAuth><AppLayout><NewTicketPage /></AppLayout></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><AppLayout><AdminPage /></AppLayout></RequireAuth>} />
      <Route path="/dashboard" element={<RequireAuth><AppLayout><DashboardPage /></AppLayout></RequireAuth>} />
    </Routes>
  )
}
```

- [ ] **Step 9: Add stub pages** (so imports resolve)

Create `src/pages/TicketsPage.tsx`, `TicketDetailPage.tsx`, `NewTicketPage.tsx`, `AdminPage.tsx`, `DashboardPage.tsx` each as:

```tsx
export function TicketsPage() { return <div className="p-6">Tickets</div> }
// (same pattern for each)
```

- [ ] **Step 10: Verify login flow**

```bash
vercel dev
```

Open `http://localhost:3000/login`, log in as `super@demo.com / password`. Expected: redirect to `/tickets` with sidebar visible.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: frontend foundation — router, auth, layout, login page"
```

---

### Task 8: Dynamic Form Renderer + New Ticket Page

**Files:**
- Create: `src/lib/dynamic-schema.ts`
- Create: `src/components/tickets/TicketForm.tsx`
- Modify: `src/pages/NewTicketPage.tsx`

**Interfaces:**
- Consumes: `GET /api/categories`, `GET /api/categories/:id/form-schema`, `POST /api/tickets`
- Produces: `buildDynamicSchema(fields: FormField[]): ZodObject` — maps field types to Zod validators
- Produces: `<TicketForm categoryId />` rendering fields in `order`

- [ ] **Step 1: Create `src/lib/dynamic-schema.ts`**

```ts
import { z } from 'zod'

export interface FormField {
  id: string
  label: string
  fieldType: 'SHORT_TEXT'|'PARAGRAPH'|'DROPDOWN'|'RADIO'|'CHECKBOXES'|'DATE'|'NUMBER'|'FILE_UPLOAD'
  options: string[] | null
  isRequired: boolean
  order: number
}

export function buildDynamicSchema(fields: FormField[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const f of fields) {
    let base: z.ZodTypeAny
    switch (f.fieldType) {
      case 'NUMBER':
        base = z.string().regex(/^-?\d+(\.\d+)?$/, 'Harus angka')
        break
      case 'CHECKBOXES':
        base = z.array(z.string())
        if (f.isRequired) base = (base as z.ZodArray<z.ZodString>).min(1, 'Wajib pilih minimal satu')
        shape[f.id] = base
        continue
      default:
        base = z.string()
    }
    shape[f.id] = f.isRequired ? (base as z.ZodString).min(1, `${f.label} wajib diisi`) : base.optional().or(z.literal(''))
  }
  return z.object(shape)
}
```

- [ ] **Step 2: Create `src/components/tickets/TicketForm.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { apiFetch } from '@/lib/api'
import { FormField } from '@/lib/dynamic-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TicketForm({ categoryId, onSubmit }: {
  categoryId: string
  onSubmit: (data: { subject: string; priority: string; fieldValues: { formFieldId: string; value: string }[] }) => void
}) {
  const { data: fields } = useQuery<FormField[]>({
    queryKey: ['form-schema', categoryId],
    queryFn: () => apiFetch(`/categories/${categoryId}/form-schema`),
    enabled: !!categoryId,
  })
  const { register, handleSubmit } = useForm()

  if (!fields) return <div>Memuat form…</div>

  const submit = (values: Record<string, unknown>) => {
    const fieldValues = fields.map(f => ({
      formFieldId: f.id,
      value: Array.isArray(values[f.id]) ? (values[f.id] as string[]).join(', ') : String(values[f.id] ?? ''),
    }))
    onSubmit({ subject: String(values.__subject ?? 'Tiket'), priority: String(values.__priority ?? 'MEDIUM'), fieldValues })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1">Subjek *</label>
        <Input {...register('__subject', { required: true })} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Prioritas</label>
        <select {...register('__priority')} className="border rounded px-3 py-2 w-full">
          <option value="LOW">Low</option><option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option><option value="CRITICAL">Critical</option>
        </select>
      </div>
      {fields.map(f => (
        <div key={f.id}>
          <label className="block text-sm font-medium mb-1">{f.label}{f.isRequired && ' *'}</label>
          {f.fieldType === 'PARAGRAPH' && <textarea {...register(f.id, { required: f.isRequired })} className="border rounded px-3 py-2 w-full" rows={3} />}
          {f.fieldType === 'SHORT_TEXT' && <Input {...register(f.id, { required: f.isRequired })} />}
          {f.fieldType === 'NUMBER' && <Input type="number" {...register(f.id, { required: f.isRequired })} />}
          {f.fieldType === 'DATE' && <Input type="date" {...register(f.id, { required: f.isRequired })} />}
          {f.fieldType === 'FILE_UPLOAD' && <Input type="file" {...register(f.id)} />}
          {f.fieldType === 'DROPDOWN' && (
            <select {...register(f.id, { required: f.isRequired })} className="border rounded px-3 py-2 w-full">
              <option value="">— pilih —</option>
              {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )}
          {f.fieldType === 'RADIO' && (f.options ?? []).map(o => (
            <label key={o} className="flex items-center gap-2"><input type="radio" value={o} {...register(f.id, { required: f.isRequired })} />{o}</label>
          ))}
          {f.fieldType === 'CHECKBOXES' && (f.options ?? []).map(o => (
            <label key={o} className="flex items-center gap-2"><input type="checkbox" value={o} {...register(f.id)} />{o}</label>
          ))}
        </div>
      ))}
      <Button type="submit">Submit Tiket</Button>
    </form>
  )
}
```

- [ ] **Step 3: Wire `src/pages/NewTicketPage.tsx`**

```tsx
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/lib/api'
import { TicketForm } from '@/components/tickets/TicketForm'

interface Category { id: string; name: string; division: { name: string } }

export function NewTicketPage() {
  const [categoryId, setCategoryId] = useState('')
  const navigate = useNavigate()
  const { data: categories } = useQuery<Category[]>({ queryKey: ['categories'], queryFn: () => apiFetch('/categories') })

  const create = useMutation({
    mutationFn: (payload: unknown) => apiFetch('/tickets', { method: 'POST', body: JSON.stringify({ ...(payload as object), categoryId }) }),
    onSuccess: () => navigate('/tickets'),
  })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Buat Tiket Baru</h1>
      <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="border rounded px-3 py-2">
        <option value="">— pilih kategori —</option>
        {categories?.map(c => <option key={c.id} value={c.id}>{c.division.name} · {c.name}</option>)}
      </select>
      {categoryId && <TicketForm categoryId={categoryId} onSubmit={(d) => create.mutate(d)} />}
    </div>
  )
}
```

- [ ] **Step 4: Verify** — as requester, pick category, fill form, submit; expect redirect to `/tickets`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: dynamic form renderer + new ticket page"
```

---

### Task 9: List View

**Files:**
- Create: `src/hooks/useTickets.ts`
- Create: `src/components/tickets/ListView.tsx`
- Modify: `src/pages/TicketsPage.tsx`

**Interfaces:**
- Consumes: `GET /api/tickets`
- Produces: `useTickets(filters)` → TanStack query with 15s polling
- Produces: `<ListView />` sortable table + saved-view sidebar

- [ ] **Step 1: Create `src/hooks/useTickets.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface TicketRow {
  id: string; ticketNumber: string; subject: string; priority: string; status: string; channel: string
  dueDate: string | null; createdAt: string
  requester: { name: string }; assignee: { name: string } | null
  category: { name: string }; division: { name: string; code: string }
}

export function useTickets(filters: Record<string, string> = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  return useQuery<TicketRow[]>({
    queryKey: ['tickets', filters],
    queryFn: () => apiFetch(`/tickets${qs ? `?${qs}` : ''}`),
    refetchInterval: 15000,
  })
}

export function isOverdue(t: TicketRow) {
  if (!t.dueDate || ['SELESAI','DITUTUP','SPAM','TRASH'].includes(t.status)) return false
  return new Date() > new Date(t.dueDate)
}
```

- [ ] **Step 2: Create `src/components/tickets/ListView.tsx`**

```tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTickets, isOverdue, TicketRow } from '@/hooks/useTickets'
import { useUiStore } from '@/store/ui'
import { formatDate } from '@/lib/utils'

const SAVED_VIEWS = [
  { key: 'ALL', label: 'All', status: '' },
  { key: 'BARU', label: 'New', status: 'BARU' },
  { key: 'SEDANG_DIKERJAKAN', label: 'Open', status: 'SEDANG_DIKERJAKAN' },
  { key: 'MENUNGGU_USER', label: 'Pending', status: 'MENUNGGU_USER' },
  { key: 'SELESAI', label: 'Resolved', status: 'SELESAI' },
  { key: 'SPAM', label: 'Spam', status: 'SPAM' },
  { key: 'TRASH', label: 'Trash', status: 'TRASH' },
]

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700', HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700', LOW: 'bg-yellow-100 text-yellow-700',
}

export function ListView() {
  const { activeFilters, setFilter } = useUiStore()
  const [search, setSearch] = useState('')
  const { data: tickets, isLoading } = useTickets({ ...activeFilters, search })

  return (
    <div className="flex">
      <div className="w-40 border-r p-2 space-y-1">
        {SAVED_VIEWS.map(v => (
          <button key={v.key} onClick={() => setFilter('status', v.status)}
            className={`block w-full text-left px-2 py-1 rounded text-sm ${activeFilters.status === v.status ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'}`}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-3">
        <input placeholder="Cari subjek…" value={search} onChange={e => setSearch(e.target.value)}
          className="border rounded px-3 py-1 mb-3 text-sm w-64" />
        {isLoading ? <p>Memuat…</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr><th className="py-2">Priority</th><th>No. Tiket</th><th>Subjek</th><th>Requester</th><th>Assignee</th><th>Dibuat</th></tr>
            </thead>
            <tbody>
              {tickets?.map((t: TicketRow) => (
                <tr key={t.id} className="border-b hover:bg-slate-50">
                  <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span></td>
                  <td className="font-mono text-xs">{t.ticketNumber}</td>
                  <td><Link to={`/tickets/${t.id}`} className="text-blue-600 hover:underline">{t.subject}</Link>
                    {isOverdue(t) && <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded">Overdue</span>}</td>
                  <td>{t.requester.name}</td>
                  <td>{t.assignee?.name ?? '—'}</td>
                  <td>{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire `src/pages/TicketsPage.tsx`**

```tsx
import { useUiStore } from '@/store/ui'
import { TopBar } from '@/components/layout/TopBar'
import { ListView } from '@/components/tickets/ListView'
import { BoardView } from '@/components/tickets/BoardView'

export function TicketsPage() {
  const { viewMode } = useUiStore()
  return (
    <div>
      <TopBar title="Tiket" />
      {viewMode === 'list' ? <ListView /> : <BoardView />}
    </div>
  )
}
```

(BoardView built in Task 10 — add a temporary stub `export function BoardView() { return null }` if building sequentially.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: list view with saved views, search, overdue badge, polling"
```

---

<!-- TASK10_PLACEHOLDER -->






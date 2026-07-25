import { Hono } from 'hono'
import { prisma } from '../_lib/prisma.js'
import { requireAuth } from '../_lib/auth.js'
import { calculateDueDate } from '../_lib/sla.js'
import { z } from 'zod'
import { put } from '@vercel/blob'

const tickets = new Hono()

tickets.get('/', requireAuth(), async (c) => {
  const { userId, role, divisionId } = c.get('user')
  const { status, priority, search, divisionId: qDiv, startDate, endDate } = c.req.query()

  const where: Record<string, unknown> = {}

  if (role === 'requester') {
    where.requesterId = userId
  } else if (role === 'agent' || role === 'division_admin') {
    where.divisionId = divisionId
  }

  if (qDiv && role === 'super_admin') {
    where.divisionId = qDiv
  }
  if (status) {
    where.status = status
  }
  if (priority) {
    where.priority = priority
  }
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { ticketNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
    }
  }

  const list = await prisma.ticket.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      division: { select: { id: true, name: true, code: true } },
    },
  })
  return c.json(list)
})

tickets.get('/:id', requireAuth(), async (c) => {
  const { userId, role, divisionId } = c.get('user')
  const ticketId = c.req.param('id') as string
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      category: true,
      division: { select: { id: true, name: true, code: true } },
      fieldValues: { include: { formField: true } },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: {
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
      activityLogs: {
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!ticket) return c.json({ error: 'Ticket tidak ditemukan' }, 404)

  if (role === 'requester' && ticket.requesterId !== userId) return c.json({ error: 'Forbidden' }, 403)
  if (role === 'agent' && ticket.divisionId !== divisionId) return c.json({ error: 'Forbidden' }, 403)
  if (role === 'division_admin' && ticket.divisionId !== divisionId) return c.json({ error: 'Forbidden' }, 403)

  const result = {
    ...ticket,
    comments: role === 'requester' ? ticket.comments.filter((c) => !c.isInternalNote) : ticket.comments,
  }
  return c.json(result)
})

const submitSchema = z.object({
  subject: z.string().min(1),
  categoryId: z.string(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  fieldValues: z.array(z.object({ formFieldId: z.string(), value: z.string() })).default([]),
})

tickets.post('/', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  const body = submitSchema.parse(await c.req.json())

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } })
  if (!category) return c.json({ error: 'Kategori tidak ditemukan' }, 404)

  const dueDate = calculateDueDate(body.priority, category)
  const year = new Date().getFullYear()
  const division = await prisma.division.findUnique({ where: { id: category.divisionId } })
  const divCode = division?.code || 'TICK'
  const prefix = `${divCode}-${year}-`

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

    const agents = await tx.user.findMany({
      where: { divisionId: category.divisionId, role: { in: ['agent', 'division_admin'] }, isActive: true },
      select: { id: true },
    })
    if (agents.length) {
      await tx.notification.createMany({
        data: agents.map((a) => ({
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
})

tickets.patch('/:id', requireAuth(), async (c) => {
  const { userId, role } = c.get('user')
  if (role === 'requester') return c.json({ error: 'Forbidden' }, 403)

  const body = patchSchema.parse(await c.req.json())
  const id = c.req.param('id') as string

  const existing = await prisma.ticket.findUnique({ where: { id } })
  if (!existing) return c.json({ error: 'Ticket tidak ditemukan' }, 404)

  const updateData: Record<string, unknown> = { ...body }
  if (body.status) {
    if (body.status === 'SELESAI' || body.status === 'RESOLVED') {
      updateData.resolvedAt = new Date()
    } else if (body.status === 'DITUTUP' || body.status === 'CLOSED') {
      updateData.closedAt = new Date()
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({ where: { id }, data: updateData })

    const logs: { ticketId: string; actorId: string; action: string; fromValue?: string; toValue?: string }[] = []
    if (body.status && body.status !== existing.status) {
      logs.push({ ticketId: id, actorId: userId, action: 'STATUS_CHANGED', fromValue: existing.status, toValue: body.status })
    }
    if (body.assigneeId !== undefined && body.assigneeId !== existing.assigneeId) {
      logs.push({ ticketId: id, actorId: userId, action: 'ASSIGNED', fromValue: existing.assigneeId ?? '', toValue: body.assigneeId ?? '' })
    }

    if (logs.length) await tx.ticketActivityLog.createMany({ data: logs })

    if (body.status) {
      await tx.notification.create({
        data: {
          userId: existing.requesterId,
          ticketId: id,
          type: 'STATUS_CHANGED',
          message: `Status tiket ${existing.ticketNumber} berubah ke ${body.status}`,
        },
      })
    }
    return t
  })

  return c.json(updated)
})

// POST /api/tickets/:id/comments
const commentSchema = z.object({ content: z.string().min(1), isInternalNote: z.boolean().default(false) })

tickets.post('/:id/comments', requireAuth(), async (c) => {
  const { userId, role } = c.get('user')
  const ticketId = c.req.param('id') as string
  const body = commentSchema.parse(await c.req.json())
  if (body.isInternalNote && role === 'requester') return c.json({ error: 'Forbidden' }, 403)

  const comment = await prisma.ticketComment.create({
    data: { ticketId, authorId: userId, ...body },
    include: { author: { select: { id: true, name: true, role: true } } },
  })
  return c.json(comment, 201)
})

// POST /api/tickets/:id/attachments (Integrated with Vercel Blob)
const attachmentSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
})

tickets.post('/:id/attachments', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  const ticketId = c.req.param('id') as string
  const body = attachmentSchema.parse(await c.req.json())

  let publicUrl = body.fileUrl
  const token = process.env.BLOB_READ_WRITE_TOKEN

  if (token && body.fileUrl.startsWith('data:')) {
    try {
      const base64Data = body.fileUrl.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')
      const safeName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const blob = await put(`attachments/${Date.now()}-${safeName}`, buffer, {
        access: 'public',
        token,
      })
      publicUrl = blob.url
    } catch (err) {
      console.error('Vercel Blob upload error:', err)
    }
  }

  const attachment = await prisma.ticketAttachment.create({
    data: {
      ticketId,
      uploadedById: userId,
      fileName: body.fileName,
      fileUrl: publicUrl,
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  await prisma.ticketActivityLog.create({
    data: {
      ticketId,
      actorId: userId,
      action: 'ATTACHMENT_ADDED',
      toValue: body.fileName,
    },
  })

  return c.json(attachment, 201)
})

export default tickets

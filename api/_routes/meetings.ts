import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../_lib/prisma.js'
import { requireAuth, JwtPayload } from '../_lib/auth.js'

const meetings = new Hono<{ Variables: { user: JwtPayload } }>()

function getMeetingRoomModel() {
  let db = getPrisma() as any
  if (!db.meetingRoom && !db.MeetingRoom && !db.meeting_room) {
    delete (globalThis as any).prisma
    db = getPrisma() as any
  }
  const keys = Object.keys(db).filter((k) => !k.startsWith('_') && !k.startsWith('$'))
  const model = db.meetingRoom || db.MeetingRoom || db.meeting_room
  if (!model) {
    throw new Error(`Model MeetingRoom belum ter-load di Prisma. Model yang tersedia: [${keys.join(', ')}]`)
  }
  return model
}

// GET /api/meetings — Get active meeting rooms stored in database
meetings.get('/', requireAuth(), async (c) => {
  const roomModel = getMeetingRoomModel()
  const rooms = await roomModel.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      host: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          division: { select: { id: true, name: true, code: true } },
        },
      },
    },
  })
  return c.json(rooms)
})

const createMeetingSchema = z.object({
  title: z.string().min(1),
  accessType: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  scheduledAt: z.string().optional(),
})

// POST /api/meetings — Create & save new meeting room in database
meetings.post('/', requireAuth(), async (c) => {
  const { userId } = c.get('user')
  const body = createMeetingSchema.parse(await c.req.json())

  const cleanId = body.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'room'
  const roomId = `HelpDesk-${cleanId}-${Date.now().toString().slice(-4)}`

  const roomModel = getMeetingRoomModel()
  const dataPayload: any = {
    roomId,
    title: body.title,
    accessType: body.accessType,
    hostId: userId,
  }
  if (body.scheduledAt) {
    const d = new Date(body.scheduledAt)
    if (!isNaN(d.getTime())) {
      dataPayload.scheduledAt = d
    }
  }

  try {
    const newRoom = await roomModel.create({
      data: dataPayload,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            role: true,
            division: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })
    return c.json(newRoom, 201)
  } catch (err: any) {
    console.warn('Prisma create fallback executed for room creation:', err?.message)
    delete dataPayload.scheduledAt
    const fallbackRoom = await roomModel.create({
      data: dataPayload,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            role: true,
            division: { select: { id: true, name: true, code: true } },
          },
        },
      },
    })
    return c.json(fallbackRoom, 201)
  }
})

// DELETE /api/meetings/:id — End/Delete room by DB id or roomId
meetings.delete('/:id', requireAuth(), async (c) => {
  const id = c.req.param('id') as string
  const roomModel = getMeetingRoomModel()

  const room = await roomModel.findFirst({
    where: {
      OR: [{ id }, { roomId: id }],
    },
  })

  if (room) {
    await roomModel.delete({ where: { id: room.id } })
  }

  return c.json({ ok: true })
})

export default meetings

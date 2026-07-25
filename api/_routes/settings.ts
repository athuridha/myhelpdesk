import { Hono } from 'hono'
import { prisma } from '../_lib/prisma'
import { requireAuth } from '../_lib/auth'
import { z } from 'zod'

const settings = new Hono()

settings.get('/app-name', async (c) => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'APP_NAME' } })
  return c.json({ appName: setting?.value || 'MyHelpDesk' })
})

const updateAppNameSchema = z.object({
  appName: z.string().min(1),
})

settings.patch('/app-name', requireAuth('super_admin'), async (c) => {
  const body = updateAppNameSchema.parse(await c.req.json())

  const setting = await prisma.systemSetting.upsert({
    where: { key: 'APP_NAME' },
    update: { value: body.appName },
    create: { key: 'APP_NAME', value: body.appName },
  })

  return c.json({ appName: setting.value })
})

export default settings

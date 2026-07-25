import { Hono } from 'hono'
import { prisma } from '../_lib/prisma.js'
import { requireAuth } from '../_lib/auth.js'
import { z } from 'zod'

const formFields = new Hono()

formFields.get('/:categoryId/form-schema', requireAuth(), async (c) => {
  const categoryId = c.req.param('categoryId') as string
  return c.json(
    await prisma.formField.findMany({
      where: { categoryId },
      orderBy: { order: 'asc' },
    })
  )
})

const fieldItem = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  fieldType: z.enum([
    'SHORT_TEXT',
    'PARAGRAPH',
    'DROPDOWN',
    'RADIO',
    'CHECKBOXES',
    'DATE',
    'NUMBER',
    'FILE_UPLOAD',
  ]),
  options: z.array(z.string()).nullable().optional(),
  isRequired: z.boolean().default(false),
  order: z.number().int(),
})

const schemaBody = z.object({
  fields: z.array(fieldItem),
})

formFields.post('/:categoryId/form-schema', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { role: actorRole, divisionId: actorDiv } = c.get('user')
  const categoryId = c.req.param('categoryId') as string

  const cat = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!cat) return c.json({ error: 'Category not found' }, 404)

  if (actorRole === 'division_admin' && cat.divisionId !== actorDiv) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { fields } = schemaBody.parse(await c.req.json())

  await prisma.$transaction(async (tx) => {
    await tx.formField.deleteMany({ where: { categoryId } })
    if (fields.length) {
      await tx.formField.createMany({
        data: fields.map((f) => ({
          categoryId,
          label: f.label,
          fieldType: f.fieldType,
          options: f.options ? f.options : undefined,
          isRequired: f.isRequired,
          order: f.order,
        })),
      })
    }
  })

  return c.json(await prisma.formField.findMany({ where: { categoryId }, orderBy: { order: 'asc' } }))
})

export default formFields

import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../lib/auth'
import { z } from 'zod'

const formFields = new Hono()

const fieldSchema = z.object({
  label: z.string().min(1),
  fieldType: z.enum(['SHORT_TEXT', 'PARAGRAPH', 'DROPDOWN', 'RADIO', 'CHECKBOXES', 'DATE', 'NUMBER', 'FILE_UPLOAD']),
  options: z.array(z.string()).optional().nullable(),
  isRequired: z.boolean().default(false),
  order: z.number().int().optional(),
})

formFields.put('/:categoryId/form-schema', requireAuth('super_admin', 'division_admin'), async (c) => {
  const { categoryId } = c.req.param()
  const fields = z.array(fieldSchema).parse(await c.req.json())

  const labels = fields.map((f) => f.label)
  if (new Set(labels).size !== labels.length) {
    return c.json({ error: 'Duplicate field labels not allowed' }, 400)
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    return c.json({ error: 'Category not found' }, 404)
  }

  await prisma.$transaction(async (tx) => {
    await tx.formField.deleteMany({ where: { categoryId } })
    if (fields.length > 0) {
      await tx.formField.createMany({
        data: fields.map((f, i) => ({
          categoryId,
          label: f.label,
          fieldType: f.fieldType,
          options: f.options ? f.options : undefined,
          isRequired: f.isRequired,
          order: i + 1,
        })),
      })
    }
  })

  const updatedFields = await prisma.formField.findMany({
    where: { categoryId },
    orderBy: { order: 'asc' },
  })

  return c.json(updatedFields)
})

export default formFields

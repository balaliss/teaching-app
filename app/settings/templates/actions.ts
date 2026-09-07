'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  gridTemplateShapeSchema,
} from '@/lib/gridTemplate'

const saveSchema = z.object({
  name: z.string().min(1).max(120),
  shape: gridTemplateShapeSchema,
})

/**
 * Saves the teacher's grid layout. Each teacher gets at most one personal
 * template; the shared default is never overwritten, so it stays available as a
 * reset target.
 */
export async function saveTemplateAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid layout.' }
  }

  const existing = await prisma.gridTemplate.findFirst({ where: { ownerId: user.id } })

  if (existing) {
    await prisma.gridTemplate.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        rows: parsed.data.shape.rows,
        columns: parsed.data.shape.columns,
      },
    })
  } else {
    await prisma.gridTemplate.create({
      data: {
        name: parsed.data.name,
        ownerId: user.id,
        rows: parsed.data.shape.rows,
        columns: parsed.data.shape.columns,
      },
    })
  }

  revalidatePath('/settings/templates')
  return { ok: true }
}

/** Drops the personal template so the shared default applies again. */
export async function resetTemplateAction(): Promise<{ ok: true }> {
  const user = await requireUser()
  await prisma.gridTemplate.deleteMany({ where: { ownerId: user.id } })
  revalidatePath('/settings/templates')
  return { ok: true }
}

export async function defaultShapeAction() {
  return { rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS }
}

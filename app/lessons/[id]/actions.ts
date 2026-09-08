'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { assertLessonOwner } from '@/lib/access'
import { generateGridForLesson } from '@/lib/grids'
import { MissingApiKeyError } from '@/lib/claude/client'
import { QuotaExceededError } from '@/lib/quota'

export async function generateGridAction(input: {
  lessonId: string
  levelId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  await assertLessonOwner(input.lessonId, user.id)

  try {
    await generateGridForLesson({
      userId: user.id,
      lessonId: input.lessonId,
      levelId: input.levelId,
    })
  } catch (error) {
    if (error instanceof QuotaExceededError || error instanceof MissingApiKeyError) {
      return { ok: false, error: error.message }
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Generation failed.',
    }
  }

  revalidatePath(`/lessons/${input.lessonId}`)
  return { ok: true }
}

const cellSchema = z.object({
  gridId: z.string().min(1),
  rowKey: z.string().min(1),
  columnKey: z.string().min(1),
  content: z.string().max(8000),
})

/** Saves a teacher edit. Marking the cell teacherEdited protects it from the
 *  next regeneration. */
export async function saveCellAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsed = cellSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That edit could not be saved.' }

  const grid = await prisma.generatedGrid.findFirst({
    where: {
      id: parsed.data.gridId,
      lesson: { module: { curriculum: { ownerId: user.id } } },
    },
    select: { id: true, lessonId: true },
  })
  if (!grid) return { ok: false, error: 'Grid not found.' }

  await prisma.gridCell.upsert({
    where: {
      gridId_rowKey_columnKey: {
        gridId: grid.id,
        rowKey: parsed.data.rowKey,
        columnKey: parsed.data.columnKey,
      },
    },
    create: {
      gridId: grid.id,
      rowKey: parsed.data.rowKey,
      columnKey: parsed.data.columnKey,
      content: parsed.data.content,
      teacherEdited: true,
    },
    update: { content: parsed.data.content, teacherEdited: true },
  })

  revalidatePath(`/lessons/${grid.lessonId}`)
  return { ok: true }
}

/** Gives a cell back to the generator on the next run. */
export async function revertCellAction(input: {
  gridId: string
  rowKey: string
  columnKey: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()

  const grid = await prisma.generatedGrid.findFirst({
    where: { id: input.gridId, lesson: { module: { curriculum: { ownerId: user.id } } } },
    select: { id: true, lessonId: true },
  })
  if (!grid) return { ok: false, error: 'Grid not found.' }

  await prisma.gridCell.updateMany({
    where: { gridId: grid.id, rowKey: input.rowKey, columnKey: input.columnKey },
    data: { teacherEdited: false },
  })

  revalidatePath(`/lessons/${grid.lessonId}`)
  return { ok: true }
}

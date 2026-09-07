'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { assertCurriculumOwner } from '@/lib/access'

const schema = z.object({
  curriculumId: z.string().min(1),
  levels: z
    .array(
      z.object({
        id: z.string().nullable(),
        name: z.string().min(1).max(80),
        description: z.string().max(1000).nullable(),
        deleted: z.boolean().default(false),
      }),
    )
    .max(10),
})

/**
 * Saves the proficiency bands for a curriculum. Districts differ (CA ELD's
 * Emerging/Expanding/Bridging, WIDA's six levels, local names), so the names and
 * descriptions are the teacher's to set — the description is what tells Claude
 * how heavily to scaffold.
 */
export async function saveLevelsAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Every level needs a name.' }

  const { curriculumId, levels } = parsed.data
  await assertCurriculumOwner(curriculumId, user.id)

  const remaining = levels.filter((level) => !level.deleted)
  if (remaining.length === 0) {
    return { ok: false, error: 'Keep at least one proficiency level.' }
  }

  await prisma.$transaction(async (tx) => {
    for (const level of levels) {
      if (level.deleted && level.id) {
        // Deleting a level removes its generated grids too, which is what the
        // teacher is asking for when they drop a band.
        await tx.proficiencyLevel.delete({ where: { id: level.id } })
      }
    }

    // Order is rewritten in two passes because (curriculumId, order) is unique:
    // negative placeholders first, then the final positions.
    let index = 0
    for (const level of remaining) {
      if (level.id) {
        await tx.proficiencyLevel.update({
          where: { id: level.id },
          data: { order: -1 - index },
        })
      }
      index += 1
    }

    index = 0
    for (const level of remaining) {
      if (level.id) {
        await tx.proficiencyLevel.update({
          where: { id: level.id },
          data: { name: level.name, description: level.description, order: index },
        })
      } else {
        await tx.proficiencyLevel.create({
          data: {
            curriculumId,
            name: level.name,
            description: level.description,
            order: index,
          },
        })
      }
      index += 1
    }
  })

  revalidatePath('/settings/levels')
  revalidatePath(`/curricula/${curriculumId}`)
  return { ok: true }
}

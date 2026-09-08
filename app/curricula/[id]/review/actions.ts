'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { assertCurriculumOwner } from '@/lib/access'
import { processCurriculum } from '@/lib/ingest'

const PHASES = ['WELCOME', 'LAUNCH', 'LEARN', 'LAND', 'WRAP', 'OTHER'] as const

const structureSchema = z.object({
  curriculumId: z.string().min(1),
  modules: z.array(
    z.object({
      id: z.string().nullable(),
      number: z.number().int().nullable(),
      title: z.string().min(1).max(200),
      focusingQuestion: z.string().max(600).nullable(),
      deleted: z.boolean().default(false),
      lessons: z.array(
        z.object({
          id: z.string().nullable(),
          number: z.number().int().nullable(),
          title: z.string().min(1).max(200),
          weekLabel: z.string().max(60).nullable(),
          deleted: z.boolean().default(false),
          sections: z.array(
            z.object({
              id: z.string().nullable(),
              phase: z.enum(PHASES),
              heading: z.string().min(1).max(200),
              rawText: z.string().max(40_000),
              deleted: z.boolean().default(false),
            }),
          ),
        }),
      ),
    }),
  ),
})

export type StructureInput = z.input<typeof structureSchema>

/**
 * Saves the whole edited tree in one transaction. Rows the teacher marked as
 * deleted are removed; rows without an id are new.
 */
export async function saveStructureAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  const parsed = structureSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Every module, lesson and phase needs a title.' }
  }

  const { curriculumId, modules } = parsed.data
  await assertCurriculumOwner(curriculumId, user.id)

  await prisma.$transaction(async (tx) => {
    let moduleOrder = 0

    for (const module of modules) {
      if (module.deleted) {
        if (module.id) await tx.module.delete({ where: { id: module.id } })
        continue
      }

      const moduleRow = module.id
        ? await tx.module.update({
            where: { id: module.id },
            data: {
              number: module.number,
              title: module.title,
              focusingQuestion: module.focusingQuestion,
              order: moduleOrder,
            },
          })
        : await tx.module.create({
            data: {
              curriculumId,
              number: module.number,
              title: module.title,
              focusingQuestion: module.focusingQuestion,
              order: moduleOrder,
            },
          })
      moduleOrder += 1

      let lessonOrder = 0
      for (const lesson of module.lessons) {
        if (lesson.deleted) {
          if (lesson.id) await tx.lesson.delete({ where: { id: lesson.id } })
          continue
        }

        const lessonRow = lesson.id
          ? await tx.lesson.update({
              where: { id: lesson.id },
              data: {
                number: lesson.number,
                title: lesson.title,
                weekLabel: lesson.weekLabel,
                order: lessonOrder,
              },
            })
          : await tx.lesson.create({
              data: {
                moduleId: moduleRow.id,
                number: lesson.number,
                title: lesson.title,
                weekLabel: lesson.weekLabel,
                order: lessonOrder,
              },
            })
        lessonOrder += 1

        let sectionOrder = 0
        for (const section of lesson.sections) {
          if (section.deleted) {
            if (section.id) await tx.lessonSection.delete({ where: { id: section.id } })
            continue
          }

          if (section.id) {
            await tx.lessonSection.update({
              where: { id: section.id },
              data: {
                phase: section.phase,
                heading: section.heading,
                rawText: section.rawText,
                order: sectionOrder,
              },
            })
          } else {
            await tx.lessonSection.create({
              data: {
                lessonId: lessonRow.id,
                phase: section.phase,
                heading: section.heading,
                rawText: section.rawText,
                order: sectionOrder,
              },
            })
          }
          sectionOrder += 1
        }
      }
    }

    await tx.curriculum.update({
      where: { id: curriculumId },
      data: { parseStatus: 'READY', parseError: null },
    })
  })

  revalidatePath(`/curricula/${curriculumId}`)
  revalidatePath(`/curricula/${curriculumId}/review`)
  return { ok: true }
}

/** Discards the current structure and re-runs the parser on the stored file. */
export async function reparseAction(
  curriculumId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()
  await assertCurriculumOwner(curriculumId, user.id)

  try {
    await processCurriculum(curriculumId)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Re-parsing failed.' }
  }

  revalidatePath(`/curricula/${curriculumId}/review`)
  return { ok: true }
}

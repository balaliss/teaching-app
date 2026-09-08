/**
 * Grid orchestration: resolve the template, enforce the quota, call Claude, and
 * persist cells without clobbering anything the teacher wrote themselves.
 */
import { prisma } from '@/lib/db'
import { generateGrid, type LessonContext } from '@/lib/claude/generateGrid'
import { readTemplateShape } from '@/lib/gridTemplate'
import { assertQuota, recordUsage } from '@/lib/quota'

/** The teacher's own template if they have one, otherwise the shared default. */
export async function resolveTemplate(userId: string) {
  const own = await prisma.gridTemplate.findFirst({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
  })
  if (own) return own

  const shared = await prisma.gridTemplate.findFirst({
    where: { ownerId: null, isDefault: true },
  })
  if (!shared) {
    throw new Error(
      'This site is missing its starting grid layout, so nothing can be written yet. ' +
        'Whoever installed it needs to run the setup step (npm run db:seed).',
    )
  }
  return shared
}

export async function generateGridForLesson(input: {
  userId: string
  lessonId: string
  levelId: string
}): Promise<{ gridId: string }> {
  await assertQuota(input.userId)

  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, module: { curriculum: { ownerId: input.userId } } },
    include: {
      sections: { orderBy: { order: 'asc' } },
      module: { include: { curriculum: true } },
    },
  })
  if (!lesson) throw new Error('We could not find that lesson.')

  const level = await prisma.proficiencyLevel.findFirst({
    where: { id: input.levelId, curriculumId: lesson.module.curriculumId },
  })
  if (!level) throw new Error('We could not find that language level.')

  const siblings = await prisma.proficiencyLevel.findMany({
    where: { curriculumId: lesson.module.curriculumId, NOT: { id: level.id } },
    orderBy: { order: 'asc' },
    select: { name: true },
  })

  const template = await resolveTemplate(input.userId)
  const shape = readTemplateShape(template)

  const grid = await prisma.generatedGrid.upsert({
    where: {
      lessonId_templateId_levelId: {
        lessonId: lesson.id,
        templateId: template.id,
        levelId: level.id,
      },
    },
    create: {
      lessonId: lesson.id,
      templateId: template.id,
      levelId: level.id,
      status: 'GENERATING',
    },
    update: { status: 'GENERATING', error: null },
  })

  // Teacher-authored cells survive regeneration and are shown to the model so
  // the rest of the grid stays consistent with them.
  const authored = await prisma.gridCell.findMany({
    where: { gridId: grid.id, teacherEdited: true },
    select: { rowKey: true, columnKey: true, content: true },
  })

  const lessonContext: LessonContext = {
    curriculumTitle: lesson.module.curriculum.title,
    gradeBand: lesson.module.curriculum.gradeBand,
    moduleNumber: lesson.module.number,
    moduleTitle: lesson.module.title,
    focusingQuestion: lesson.module.focusingQuestion,
    lessonNumber: lesson.number,
    lessonTitle: lesson.title,
    weekLabel: lesson.weekLabel,
    sections: lesson.sections.map((section) => ({
      phase: section.phase,
      heading: section.heading,
      rawText: section.rawText,
    })),
  }

  try {
    const result = await generateGrid({
      lesson: lessonContext,
      level: {
        name: level.name,
        description: level.description,
        siblingNames: siblings.map((s) => s.name),
      },
      shape,
      teacherAuthored: authored,
    })

    const authoredKeys = new Set(authored.map((cell) => `${cell.rowKey}/${cell.columnKey}`))

    await prisma.$transaction(async (tx) => {
      // Drop cells for rows/columns the template no longer has, so an edited
      // template does not leave orphans behind.
      await tx.gridCell.deleteMany({
        where: {
          gridId: grid.id,
          NOT: {
            OR: [
              { teacherEdited: true },
              {
                AND: [
                  { rowKey: { in: shape.rows.map((r) => r.key) } },
                  { columnKey: { in: shape.columns.map((c) => c.key) } },
                ],
              },
            ],
          },
        },
      })

      for (const cell of result.cells) {
        if (authoredKeys.has(`${cell.rowKey}/${cell.columnKey}`)) continue
        await tx.gridCell.upsert({
          where: {
            gridId_rowKey_columnKey: {
              gridId: grid.id,
              rowKey: cell.rowKey,
              columnKey: cell.columnKey,
            },
          },
          create: {
            gridId: grid.id,
            rowKey: cell.rowKey,
            columnKey: cell.columnKey,
            content: cell.content,
          },
          update: { content: cell.content, teacherEdited: false },
        })
      }

      await tx.generatedGrid.update({
        where: { id: grid.id },
        data: {
          status: 'READY',
          model: result.usage.model,
          generatedAt: new Date(),
          error: null,
        },
      })
    })

    await recordUsage({
      userId: input.userId,
      kind: 'grid',
      model: result.usage.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      gridId: grid.id,
    })

    return { gridId: grid.id }
  } catch (error) {
    await prisma.generatedGrid.update({
      where: { id: grid.id },
      data: {
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Generation failed.',
      },
    })
    throw error
  }
}

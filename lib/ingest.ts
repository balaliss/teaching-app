/**
 * Upload → parse → persist pipeline for a curriculum document.
 */
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import { DEFAULT_LEVELS } from '@/lib/gridTemplate'
import { extractDocument, kindFor } from '@/lib/parse/extract'
import { storage, uploadKey } from '@/lib/storage'
import { structureWithClaude } from '@/lib/parse/structureWithClaude'
import { recordUsage } from '@/lib/quota'
import {
  CONFIDENCE_FLOOR,
  parseWitAndWisdom,
  type ParseResult,
} from '@/lib/parse/witAndWisdom'

export async function createCurriculum(input: {
  userId: string
  title: string
  gradeBand: string | null
  fileName: string
  mimeType: string
  bytes: Buffer
}): Promise<string> {
  if (!kindFor(input.mimeType, input.fileName)) {
    throw new Error('That file type will not work. Upload a PDF, a Word file, or an Excel file.')
  }
  if (input.bytes.byteLength > env.maxUploadBytes) {
    throw new Error(
      `That file is bigger than the ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB limit, so it can't be uploaded.`,
    )
  }

  const key = uploadKey(input.userId, input.fileName)
  await storage().put(key, input.bytes, input.mimeType)

  const curriculum = await prisma.curriculum.create({
    data: {
      title: input.title,
      gradeBand: input.gradeBand,
      sourceFileKey: key,
      sourceFileName: input.fileName,
      sourceMimeType: input.mimeType,
      ownerId: input.userId,
      parseStatus: 'PENDING',
      levels: {
        create: DEFAULT_LEVELS.map((level) => ({
          name: level.name,
          description: level.description,
          order: level.order,
        })),
      },
    },
  })

  return curriculum.id
}

/**
 * Extracts and structures an uploaded document. The deterministic parser runs
 * first; Claude is only asked when that recognises too little, which keeps the
 * common case free and fast.
 */
export async function processCurriculum(curriculumId: string): Promise<void> {
  const curriculum = await prisma.curriculum.findUniqueOrThrow({
    where: { id: curriculumId },
    select: {
      id: true,
      ownerId: true,
      sourceFileKey: true,
      sourceFileName: true,
      sourceMimeType: true,
    },
  })

  await prisma.curriculum.update({
    where: { id: curriculumId },
    data: { parseStatus: 'PARSING', parseError: null },
  })

  try {
    const bytes = await storage().get(curriculum.sourceFileKey)
    const document = await extractDocument(
      bytes,
      curriculum.sourceMimeType,
      curriculum.sourceFileName,
    )

    let result: ParseResult = parseWitAndWisdom(document)

    if (result.confidence < CONFIDENCE_FLOOR && env.anthropicApiKey) {
      const fallback = await structureWithClaude(document)
      await recordUsage({
        userId: curriculum.ownerId,
        kind: 'structure',
        model: fallback.usage.model,
        inputTokens: fallback.usage.inputTokens,
        outputTokens: fallback.usage.outputTokens,
      })
      // Keep whichever pass actually found more structure.
      if (fallback.result.confidence > result.confidence) {
        result = fallback.result
      }
    }

    await persistParseResult(curriculumId, result)

    const lessonCount = result.modules.reduce((sum, m) => sum + m.lessons.length, 0)
    await prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        parseStatus: lessonCount === 0 ? 'FAILED' : 'NEEDS_REVIEW',
        parseError:
          lessonCount === 0
            ? (result.notes[0] ??
              'No lessons could be identified. You can still add modules and lessons by hand.')
            : null,
      },
    })
  } catch (error) {
    await prisma.curriculum.update({
      where: { id: curriculumId },
      data: {
        parseStatus: 'FAILED',
        parseError: error instanceof Error ? error.message : 'Parsing failed.',
      },
    })
    throw error
  }
}

/** Replaces any previously parsed structure for this curriculum. */
async function persistParseResult(curriculumId: string, result: ParseResult): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.module.deleteMany({ where: { curriculumId } })

    for (const module of result.modules) {
      await tx.module.create({
        data: {
          curriculumId,
          number: module.number,
          title: module.title,
          focusingQuestion: module.focusingQuestion,
          order: module.order,
          lessons: {
            create: module.lessons.map((lesson) => ({
              number: lesson.number,
              title: lesson.title,
              weekLabel: lesson.weekLabel,
              pageStart: lesson.pageStart,
              pageEnd: lesson.pageEnd,
              order: lesson.order,
              sections: {
                create: lesson.sections.map((section) => ({
                  phase: section.phase,
                  heading: section.heading,
                  // Sections can be very long; keep enough for good generation
                  // without storing whole chapters per row.
                  rawText: section.rawText.slice(0, 40_000),
                  order: section.order,
                })),
              },
            })),
          },
        },
      })
    }
  })
}

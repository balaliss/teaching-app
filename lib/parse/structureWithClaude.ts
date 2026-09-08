/**
 * Fallback structuring pass. Teacher Edition layouts vary between grades and
 * printings, so when the deterministic parser recognises too little we ask Claude
 * to identify the module/lesson/phase boundaries instead. The teacher still
 * confirms the result on the review page.
 */
import { z } from 'zod'
import { anthropic, toolResult } from '@/lib/claude/client'
import { env } from '@/lib/env'
import type { ExtractedDocument } from '@/lib/parse/extract'
import { LESSONS_PER_WEEK, type ParseResult } from '@/lib/parse/witAndWisdom'

/** Keeps a very long Teacher Edition inside a sane request size. */
const MAX_CHARS = 400_000

const outlineSchema = z.object({
  modules: z
    .array(
      z.object({
        number: z.number().int().nullable().optional(),
        title: z.string(),
        focusingQuestion: z.string().nullable().optional(),
        lessons: z.array(
          z.object({
            number: z.number().int().nullable().optional(),
            title: z.string(),
            weekLabel: z.string().nullable().optional(),
            pageStart: z.number().int().nullable().optional(),
            pageEnd: z.number().int().nullable().optional(),
            sections: z.array(
              z.object({
                phase: z.enum(['WELCOME', 'LAUNCH', 'LEARN', 'LAND', 'WRAP', 'OTHER']),
                heading: z.string(),
                /** Inclusive page range whose text belongs to this phase. */
                pageStart: z.number().int().nullable().optional(),
                pageEnd: z.number().int().nullable().optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .default([]),
})

const OUTLINE_TOOL = {
  name: 'record_outline',
  description:
    'Record the module, lesson and lesson-phase structure found in the curriculum document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      modules: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            number: { type: ['integer', 'null'], description: 'Module number if stated.' },
            title: { type: 'string' },
            focusingQuestion: { type: ['string', 'null'] },
            lessons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  number: { type: ['integer', 'null'] },
                  title: { type: 'string' },
                  weekLabel: {
                    type: ['string', 'null'],
                    description: 'Only if the document states a week; otherwise null.',
                  },
                  pageStart: { type: ['integer', 'null'] },
                  pageEnd: { type: ['integer', 'null'] },
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        phase: {
                          type: 'string',
                          enum: ['WELCOME', 'LAUNCH', 'LEARN', 'LAND', 'WRAP', 'OTHER'],
                        },
                        heading: { type: 'string' },
                        pageStart: { type: ['integer', 'null'] },
                        pageEnd: { type: ['integer', 'null'] },
                      },
                      required: ['phase', 'heading'],
                    },
                  },
                },
                required: ['title', 'sections'],
              },
            },
          },
          required: ['title', 'lessons'],
        },
      },
    },
    required: ['modules'],
  },
}

const SYSTEM_PROMPT = `You identify structure in teacher curriculum documents, in particular Wit & Wisdom and Wit & Wisdom ELD Teacher Editions.

Those are organised Module -> Lesson -> lesson phase, where the phases are Welcome, Launch, Learn, Land and Wrap. Use OTHER for content that belongs to a lesson but sits outside those phases (preparation notes, materials lists, assessments).

Rules:
- Report only structure that is actually present. Do not invent lessons or phases.
- Ignore table-of-contents pages, front matter, appendices and answer keys.
- Page numbers refer to the [page N] markers in the supplied text, not printed page numbers.
- If the document is a pacing guide or scope-and-sequence rather than a Teacher Edition, record its weeks as lessons with a single OTHER section.`

function documentToPrompt(document: ExtractedDocument): string {
  let out = ''
  for (const { page, text } of document.pages) {
    const chunk = `\n[page ${page}]\n${text.trim()}\n`
    if (out.length + chunk.length > MAX_CHARS) break
    out += chunk
  }
  return out
}

export interface StructureWithClaudeResult {
  result: ParseResult
  usage: { model: string; inputTokens: number; outputTokens: number }
}

export async function structureWithClaude(
  document: ExtractedDocument,
): Promise<StructureWithClaudeResult> {
  const model = env.structureModel
  const message = await anthropic().messages.create({
    model,
    max_tokens: 16_000,
    system: SYSTEM_PROMPT,
    tools: [OUTLINE_TOOL],
    tool_choice: { type: 'tool', name: OUTLINE_TOOL.name },
    messages: [
      {
        role: 'user',
        content: `Identify the structure of this curriculum document.\n\n${documentToPrompt(document)}`,
      },
    ],
  })

  const raw = toolResult<unknown>(message, OUTLINE_TOOL.name)
  const parsed = outlineSchema.safeParse(raw)

  const usage = {
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }

  if (!parsed.success) {
    return {
      result: {
        modules: [],
        confidence: 0,
        notes: ['Claude could not identify a usable structure in this document.'],
      },
      usage,
    }
  }

  return { result: toParseResult(parsed.data, document), usage }
}

type Outline = z.infer<typeof outlineSchema>

/** Rehydrates the outline into a ParseResult, slicing page text into each phase. */
function toParseResult(outline: Outline, document: ExtractedDocument): ParseResult {
  const pageText = new Map(document.pages.map((p) => [p.page, p.text]))

  const textForRange = (start?: number | null, end?: number | null): string => {
    if (!start) return ''
    const last = end && end >= start ? end : start
    const parts: string[] = []
    for (let page = start; page <= last; page += 1) {
      const text = pageText.get(page)
      if (text) parts.push(text.trim())
    }
    return parts.join('\n')
  }

  const modules = outline.modules
    .map((module, moduleIndex) => ({
      number: module.number ?? null,
      title: module.title,
      focusingQuestion: module.focusingQuestion ?? null,
      order: moduleIndex,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        number: lesson.number ?? null,
        title: lesson.title,
        weekLabel:
          lesson.weekLabel ?? `Week ${Math.floor(lessonIndex / LESSONS_PER_WEEK) + 1}`,
        pageStart: lesson.pageStart ?? null,
        pageEnd: lesson.pageEnd ?? null,
        order: lessonIndex,
        sections: lesson.sections.map((section, sectionIndex) => ({
          phase: section.phase,
          heading: section.heading,
          rawText:
            textForRange(section.pageStart, section.pageEnd) ||
            textForRange(lesson.pageStart, lesson.pageEnd),
          order: sectionIndex,
        })),
      })),
    }))
    .filter((module) => module.lessons.length > 0)

  const lessonCount = modules.reduce((sum, module) => sum + module.lessons.length, 0)

  return {
    modules,
    confidence: lessonCount > 0 ? 0.6 : 0,
    notes:
      lessonCount > 0
        ? ['Structure identified by Claude — check it on this page before generating grids.']
        : ['Claude found no lessons in this document.'],
  }
}

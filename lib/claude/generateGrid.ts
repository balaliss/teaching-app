/**
 * Turns one lesson's Teacher Edition text into an explicit instruction grid for
 * one proficiency level.
 *
 * The tool schema is built from the GridTemplate at call time, so the columns the
 * teacher configured in Settings are exactly the keys Claude must fill — the
 * result maps 1:1 onto GridCell rows with no post-hoc guessing.
 */
import { anthropic, toolResult } from '@/lib/claude/client'
import { env } from '@/lib/env'
import type { GridAxisItem, GridTemplateShape } from '@/lib/gridTemplate'

export interface LessonContext {
  curriculumTitle: string
  gradeBand: string | null
  moduleNumber: number | null
  moduleTitle: string
  focusingQuestion: string | null
  lessonNumber: number | null
  lessonTitle: string
  weekLabel: string | null
  sections: Array<{ phase: string; heading: string; rawText: string }>
}

export interface LevelContext {
  name: string
  description: string | null
  siblingNames: string[]
}

export interface GeneratedCell {
  rowKey: string
  columnKey: string
  content: string
}

export interface GenerateGridResult {
  cells: GeneratedCell[]
  usage: { model: string; inputTokens: number; outputTokens: number }
}

const TOOL_NAME = 'record_grid'

/** Cap on Teacher Edition text sent per phase, to keep requests bounded. */
const MAX_SECTION_CHARS = 12_000

function describe(item: GridAxisItem): string {
  return item.hint ? `${item.label} — ${item.hint}` : item.label
}

function buildTool(shape: GridTemplateShape) {
  const rowProperties: Record<string, unknown> = {}

  for (const row of shape.rows) {
    const columnProperties: Record<string, unknown> = {}
    for (const column of shape.columns) {
      columnProperties[column.key] = {
        type: 'string',
        description: describe(column),
      }
    }

    rowProperties[row.key] = {
      type: 'object',
      description: describe(row),
      properties: columnProperties,
      required: shape.columns.map((column) => column.key),
      additionalProperties: false,
    }
  }

  return {
    name: TOOL_NAME,
    description:
      'Record the completed instruction grid. Fill every cell. Use the exact row and column keys given.',
    input_schema: {
      type: 'object' as const,
      properties: {
        grid: {
          type: 'object',
          properties: rowProperties,
          required: shape.rows.map((row) => row.key),
          additionalProperties: false,
        },
      },
      required: ['grid'],
    },
  }
}

const SYSTEM_PROMPT = `You write explicit, classroom-ready teaching instructions from Wit & Wisdom and Wit & Wisdom ELD Teacher Edition material.

Your reader is a teacher holding a clipboard mid-lesson. Write so they can teach directly from the grid without turning back to the Teacher Edition.

How to write each cell:
- Be specific and sequential. Number the moves within a cell (1., 2., 3.) when there is more than one.
- Put exact teacher language in quotation marks. Prefer real wording over descriptions of wording: write 3. Say: "Turn to your partner and describe what changed." rather than "prompt partners to discuss".
- Name the grouping (whole class, partners, triads, independent) and the routine by name when the Teacher Edition names one.
- Keep to what the source material actually contains. Do not invent texts, page numbers, handout names, or assessments that are not in the supplied text. If the source does not cover a cell, write what can be justified from it and keep it short rather than padding.
- No preamble, no meta-commentary, no headings inside cells. Plain text only, no markdown.
- Aim for 40-120 words in substantive cells; short factual cells (times, materials) should be brief lists.

Differentiating by proficiency level:
- You are writing ONE version of this lesson, for the single named proficiency level only. Every cell is scaffolded for that level.
- Scaffolding is the difference between levels: the amount of modelling, the length of expected output, whether frames are supplied or generated, how much of the text is read aloud versus independently, and how much of the language demand is pre-taught.
- Supply the actual sentence frames and target vocabulary as text the teacher can say or post, not as an instruction to "provide frames".
- Do not lower the content demand between levels; lower the language demand. Students at every level engage with the same text and the same thinking.`

function lessonPrompt(lesson: LessonContext, level: LevelContext, shape: GridTemplateShape): string {
  const header = [
    `Curriculum: ${lesson.curriculumTitle}`,
    lesson.gradeBand ? `Grade band: ${lesson.gradeBand}` : null,
    `Module: ${lesson.moduleNumber ? `${lesson.moduleNumber} — ` : ''}${lesson.moduleTitle}`,
    lesson.focusingQuestion ? `Focusing Question: ${lesson.focusingQuestion}` : null,
    `Lesson: ${lesson.lessonNumber ? `${lesson.lessonNumber} — ` : ''}${lesson.lessonTitle}`,
    lesson.weekLabel ? `Week: ${lesson.weekLabel}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const levelBlock = [
    `Write this grid for one proficiency level only: ${level.name}.`,
    level.description ? `What that level means here: ${level.description}` : null,
    level.siblingNames.length > 0
      ? `The other levels in use are ${level.siblingNames.join(', ')} — they are handled separately, so do not address them here.`
      : null,
  ]
    .filter(Boolean)
    .join('\n')

  const rows = shape.rows.map((row) => `- ${row.key}: ${describe(row)}`).join('\n')
  const columns = shape.columns.map((column) => `- ${column.key}: ${describe(column)}`).join('\n')

  const sourceText =
    lesson.sections.length === 0
      ? '(No Teacher Edition text was captured for this lesson. Say so plainly in the cells rather than inventing content.)'
      : lesson.sections
          .map(
            (section) =>
              `### ${section.phase} — ${section.heading}\n${section.rawText.slice(0, MAX_SECTION_CHARS).trim()}`,
          )
          .join('\n\n')

  return `${header}

${levelBlock}

Grid rows to fill (row keys):
${rows}

Grid columns to fill (column keys):
${columns}

Map the Teacher Edition text below onto those rows. A row whose phase is not present in the source should be filled from the closest relevant material, or kept brief if there is genuinely nothing for it.

--- TEACHER EDITION TEXT ---
${sourceText}
--- END TEACHER EDITION TEXT ---

Call ${TOOL_NAME} with every row and every column filled.`
}

export async function generateGrid(input: {
  lesson: LessonContext
  level: LevelContext
  shape: GridTemplateShape
  /** Cells the teacher wrote themselves; kept out of the generated output. */
  teacherAuthored?: GeneratedCell[]
}): Promise<GenerateGridResult> {
  const model = env.gridModel
  const tool = buildTool(input.shape)

  let prompt = lessonPrompt(input.lesson, input.level, input.shape)

  if (input.teacherAuthored && input.teacherAuthored.length > 0) {
    const authored = input.teacherAuthored
      .map((cell) => `[${cell.rowKey} / ${cell.columnKey}] ${cell.content}`)
      .join('\n')
    prompt += `\n\nThe teacher has already written these cells themselves. They will be kept as-is and must not be contradicted — write the rest of the grid so it is consistent with them:\n${authored}`
  }

  const message = await anthropic().messages.create({
    model,
    max_tokens: 16_000,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = toolResult<{ grid?: Record<string, Record<string, unknown>> }>(message, TOOL_NAME)
  const usage = {
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }

  if (!raw?.grid) {
    throw new Error('Claude did not return a grid. Try generating again.')
  }

  const cells: GeneratedCell[] = []
  for (const row of input.shape.rows) {
    const rowValue = raw.grid[row.key]
    for (const column of input.shape.columns) {
      const value = rowValue?.[column.key]
      cells.push({
        rowKey: row.key,
        columnKey: column.key,
        content: typeof value === 'string' ? value.trim() : '',
      })
    }
  }

  return { cells, usage }
}

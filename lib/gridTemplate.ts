/**
 * The grid shape is data, not code.
 *
 * A GridTemplate holds `rows` and `columns` as JSON. Generation prompts, the grid
 * editor and the print view all read the same template, so changing the layout is
 * a Settings edit rather than a migration. The default below is a starting point
 * for Wit & Wisdom ELD and is expected to be revised against a real lesson.
 */
import { z } from 'zod'

export const gridAxisItemSchema = z.object({
  /** Stable identifier stored on GridCell. Never change it after cells exist. */
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers and underscores'),
  label: z.string().min(1).max(80),
  /** Optional guidance passed to Claude to say what belongs in this row/column. */
  hint: z.string().max(400).optional(),
})

export type GridAxisItem = z.infer<typeof gridAxisItemSchema>

const uniqueKeys = (items: GridAxisItem[]) =>
  new Set(items.map((i) => i.key)).size === items.length

export const gridAxisSchema = z
  .array(gridAxisItemSchema)
  .min(1, 'At least one entry is required')
  .max(20, 'At most 20 entries')
  .refine(uniqueKeys, { message: 'Keys must be unique' })

export const gridTemplateShapeSchema = z.object({
  rows: gridAxisSchema,
  columns: gridAxisSchema,
})

export type GridTemplateShape = z.infer<typeof gridTemplateShapeSchema>

/** Wit & Wisdom lesson phases, in the order they are taught. */
export const DEFAULT_ROWS: GridAxisItem[] = [
  {
    key: 'welcome',
    label: 'Welcome',
    hint: 'Opening routine that activates prior knowledge and gets students using language immediately.',
  },
  {
    key: 'launch',
    label: 'Launch',
    hint: 'Framing the lesson: the Content Framing Question and what students are about to do and why.',
  },
  {
    key: 'learn',
    label: 'Learn',
    hint: 'The main instructional work, broken into the numbered activities from the Teacher Edition.',
  },
  {
    key: 'land',
    label: 'Land',
    hint: 'Returning to the framing question and consolidating what was learned.',
  },
  {
    key: 'wrap',
    label: 'Wrap',
    hint: 'Closing tasks, homework, and anything that carries into the next lesson.',
  },
]

export const DEFAULT_COLUMNS: GridAxisItem[] = [
  {
    key: 'minutes',
    label: 'Minutes',
    hint: 'Suggested time in minutes for this phase. Just the number and unit.',
  },
  {
    key: 'teacher_does',
    label: 'Teacher says & does',
    hint: 'Explicit, sequential moves. Include exact wording for prompts and directions in quotation marks. Imperative voice, numbered steps.',
  },
  {
    key: 'students_do',
    label: 'Students do',
    hint: 'What students are doing, including grouping (whole class, partners, triads) and the language structure they use.',
  },
  {
    key: 'materials',
    label: 'Materials',
    hint: 'Texts, handouts, Response Journals, anchor charts, word banks and technology needed for this phase.',
  },
  {
    key: 'language_objective',
    label: 'Language objective',
    hint: 'The language demand of this phase: target vocabulary, sentence frames, and the language function being practiced.',
  },
  {
    key: 'check_for_understanding',
    label: 'Check for understanding',
    hint: 'The observable evidence the teacher looks for, plus what to do if students are not showing it.',
  },
]

export const DEFAULT_TEMPLATE_NAME = 'W&W ELD — Lesson Detail'

export const DEFAULT_LEVELS = [
  {
    name: 'Emerging',
    description:
      'Students at an early stage of English development. Heavy scaffolding: single words and short phrases, sentence frames supplied, visuals and gestures throughout.',
    order: 0,
  },
  {
    name: 'Expanding',
    description:
      'Students who can produce and comprehend sentence-level English. Moderate scaffolding: expanded sentence frames, partner rehearsal before sharing.',
    order: 1,
  },
  {
    name: 'Bridging',
    description:
      'Students approaching grade-level proficiency. Light scaffolding: academic vocabulary, connected discourse, and text-based justification.',
    order: 2,
  },
]

/** Parses the JSON columns on a GridTemplate row, falling back to the defaults. */
export function readTemplateShape(template: {
  rows: unknown
  columns: unknown
}): GridTemplateShape {
  const parsed = gridTemplateShapeSchema.safeParse({
    rows: template.rows,
    columns: template.columns,
  })
  if (parsed.success) return parsed.data
  return { rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS }
}

/** Turns a label into a usable key, for new rows/columns added in Settings. */
export function toKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field'
  )
}

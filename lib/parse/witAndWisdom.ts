/**
 * Structural parser for Wit & Wisdom (and W&W ELD) Teacher Edition text.
 *
 * The Teacher Edition is organised Module → Lesson → phase (Welcome, Launch,
 * Learn, Land, Wrap). This pass is deliberately deterministic and conservative:
 * it recognises headings by shape, and anything it is unsure about is left for
 * the teacher to correct on the review page. When it recognises too little, the
 * upload flow falls back to `structureWithClaude`.
 */
import type { ExtractedDocument } from '@/lib/parse/extract'

export type Phase = 'WELCOME' | 'LAUNCH' | 'LEARN' | 'LAND' | 'WRAP' | 'OTHER'

export interface ParsedSection {
  phase: Phase
  heading: string
  rawText: string
  order: number
}

export interface ParsedLesson {
  number: number | null
  title: string
  weekLabel: string | null
  pageStart: number | null
  pageEnd: number | null
  order: number
  sections: ParsedSection[]
}

export interface ParsedModule {
  number: number | null
  title: string
  focusingQuestion: string | null
  order: number
  lessons: ParsedLesson[]
}

export interface ParseResult {
  modules: ParsedModule[]
  /** 0–1. Below CONFIDENCE_FLOOR the caller should try the Claude fallback. */
  confidence: number
  notes: string[]
}

export const CONFIDENCE_FLOOR = 0.4

/** W&W is taught roughly a lesson a day, so weeks are derived unless stated. */
export const LESSONS_PER_WEEK = 5

const MODULE_RE = /^module\s+(\d+)\b[\s:.–—-]*(.*)$/i
const LESSON_RE = /^lesson\s+(\d+)\b[\s:.–—-]*(.*)$/i
const PHASE_RE =
  /^(welcome|launch|learn|land|wrap)\b[\s:.–—-]*(?:\(?\s*\d+\s*min[a-z.]*\s*\)?)?\s*$/i
const FOCUSING_QUESTION_RE = /focusing\s+question\s*(?:\d+)?\s*:\s*(.+)$/i
const WEEK_RE = /^week\s+(\d+)\b[\s:.–—-]*(.*)$/i

interface Line {
  text: string
  page: number
}

function toLines(document: ExtractedDocument): Line[] {
  const lines: Line[] = []
  for (const { page, text } of document.pages) {
    for (const raw of text.split(/\r?\n/)) {
      const trimmed = raw.replace(/\s+/g, ' ').trim()
      if (trimmed) lines.push({ text: trimmed, page })
    }
  }
  return lines
}

/**
 * A heading is short and does not read like prose. This keeps in-body
 * cross-references ("as students did in Lesson 4, they now…") from being
 * mistaken for lesson headings.
 */
function looksLikeHeading(text: string): boolean {
  if (text.length > 110) return false
  if (/[.;]\s+\S/.test(text)) return false
  if (/\b(students|they|see|refer|review(ed)?|from|during|in)\b/i.test(text.slice(0, 20))) {
    return false
  }
  return true
}

function isPhaseLine(text: string): Phase | null {
  const match = PHASE_RE.exec(text)
  if (!match) return null
  return match[1].toUpperCase() as Phase
}

export function parseWitAndWisdom(document: ExtractedDocument): ParseResult {
  const lines = toLines(document)
  const notes: string[] = []
  const modules: ParsedModule[] = []

  // Held in an object rather than plain locals: the helpers below assign to
  // these, and TypeScript cannot follow assignments made inside closures.
  const state: {
    module: ParsedModule | null
    lesson: ParsedLesson | null
    section: ParsedSection | null
    week: string | null
  } = { module: null, lesson: null, section: null, week: null }

  const startModule = (number: number | null, title: string) => {
    const module: ParsedModule = {
      number,
      title: title || (number ? `Module ${number}` : 'Module'),
      focusingQuestion: null,
      order: modules.length,
      lessons: [],
    }
    modules.push(module)
    state.module = module
    state.lesson = null
    state.section = null
  }

  const startLesson = (number: number | null, title: string, page: number) => {
    if (!state.module) startModule(null, 'Uncategorized')
    const parent = state.module!
    const order = parent.lessons.length
    const lesson: ParsedLesson = {
      number,
      title: title || (number ? `Lesson ${number}` : 'Lesson'),
      weekLabel: state.week ?? `Week ${Math.floor(order / LESSONS_PER_WEEK) + 1}`,
      pageStart: page,
      pageEnd: page,
      order,
      sections: [],
    }
    parent.lessons.push(lesson)
    state.lesson = lesson
    state.section = null
  }

  const startSection = (phase: Phase, heading: string) => {
    const lesson = state.lesson
    if (!lesson) return
    const section: ParsedSection = {
      phase,
      heading,
      rawText: '',
      order: lesson.sections.length,
    }
    lesson.sections.push(section)
    state.section = section
  }

  for (const line of lines) {
    const { text, page } = line

    const weekMatch = WEEK_RE.exec(text)
    if (weekMatch && looksLikeHeading(text)) {
      state.week = `Week ${weekMatch[1]}`
      continue
    }

    const moduleMatch = MODULE_RE.exec(text)
    if (moduleMatch && looksLikeHeading(text)) {
      startModule(Number.parseInt(moduleMatch[1], 10), moduleMatch[2].trim())
      continue
    }

    const lessonMatch = LESSON_RE.exec(text)
    if (lessonMatch && looksLikeHeading(text)) {
      startLesson(Number.parseInt(lessonMatch[1], 10), lessonMatch[2].trim(), page)
      continue
    }

    const focusing = FOCUSING_QUESTION_RE.exec(text)
    if (focusing && state.module && !state.module.focusingQuestion) {
      state.module.focusingQuestion = focusing[1].trim()
      // Fall through: the line is also useful context inside the current section.
    }

    const phase = isPhaseLine(text)
    if (phase && state.lesson) {
      startSection(phase, text)
      continue
    }

    if (state.lesson) {
      state.lesson.pageEnd = page
      if (!state.section) startSection('OTHER', 'Lesson overview')
      const section = state.section
      if (section) {
        section.rawText = section.rawText ? `${section.rawText}\n${text}` : text
      }
    }
  }

  // Drop lessons that captured no text at all: almost always a table-of-contents
  // entry rather than a real lesson.
  for (const module of modules) {
    module.lessons = module.lessons.filter((lesson) =>
      lesson.sections.some((section) => section.rawText.trim().length > 0),
    )
    module.lessons.forEach((lesson, index) => {
      lesson.order = index
      if (!lesson.weekLabel) {
        lesson.weekLabel = `Week ${Math.floor(index / LESSONS_PER_WEEK) + 1}`
      }
    })
  }

  const populated = modules.filter((module) => module.lessons.length > 0)
  populated.forEach((module, index) => {
    module.order = index
  })

  const lessonCount = populated.reduce((sum, module) => sum + module.lessons.length, 0)
  const phasedLessons = populated
    .flatMap((module) => module.lessons)
    .filter((lesson) => lesson.sections.some((section) => section.phase !== 'OTHER')).length

  if (lessonCount === 0) notes.push('No lessons were recognised in this document.')
  else if (phasedLessons === 0) {
    notes.push('Lessons were found but no Welcome/Launch/Learn/Land headings were recognised.')
  }

  return {
    modules: populated,
    confidence: confidenceFor(lessonCount, phasedLessons),
    notes,
  }
}

function confidenceFor(lessonCount: number, phasedLessons: number): number {
  if (lessonCount === 0) return 0
  // Recognising phases is the real signal that this is a Teacher Edition.
  const phaseRatio = phasedLessons / lessonCount
  const volume = Math.min(lessonCount / 5, 1)
  return Number((0.3 * volume + 0.7 * phaseRatio).toFixed(2))
}

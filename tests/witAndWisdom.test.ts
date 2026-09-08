import { describe, expect, it } from 'vitest'
import { parseWitAndWisdom, CONFIDENCE_FLOOR } from '@/lib/parse/witAndWisdom'
import type { ExtractedDocument } from '@/lib/parse/extract'

const doc = (pages: string[]): ExtractedDocument => ({
  pages: pages.map((text, index) => ({ page: index + 1, text })),
})

const TEACHER_EDITION = doc([
  `Module 1: A Great Heart
Focusing Question: Why is the heart called a pump?

Lesson 1
Welcome (5 min.)
Display the image of the heart. Ask students what they notice.
Launch (5 min.)
Introduce the Content Framing Question: What does a heart do?
Learn (55 min.)
Read aloud pages 4-7 of the text. Students record noticings in the Response Journal.
Partners describe one change they observe using the frame "First ___, then ___."
Land (10 min.)
Return to the Content Framing Question and record a shared response.
Wrap (5 min.)
Assign the volume of reading question for tonight.`,
  `Lesson 2
Welcome (5 min.)
Students revisit their Response Journal entry from Lesson 1.
Learn (60 min.)
Introduce the vocabulary word circulate. Students act out the word.
Land (10 min.)
Students answer the Content Framing Question in one sentence.`,
])

describe('parseWitAndWisdom', () => {
  it('finds modules, lessons and phases in a Teacher Edition', () => {
    const result = parseWitAndWisdom(TEACHER_EDITION)

    expect(result.modules).toHaveLength(1)
    const [module] = result.modules
    expect(module.number).toBe(1)
    expect(module.title).toBe('A Great Heart')
    expect(module.focusingQuestion).toBe('Why is the heart called a pump?')
    expect(module.lessons).toHaveLength(2)

    const [lessonOne, lessonTwo] = module.lessons
    expect(lessonOne.number).toBe(1)
    expect(lessonOne.sections.map((s) => s.phase)).toEqual([
      'WELCOME',
      'LAUNCH',
      'LEARN',
      'LAND',
      'WRAP',
    ])
    expect(lessonTwo.sections.map((s) => s.phase)).toEqual(['WELCOME', 'LEARN', 'LAND'])
  })

  it('captures the Teacher Edition text under the right phase', () => {
    const result = parseWitAndWisdom(TEACHER_EDITION)
    const learn = result.modules[0].lessons[0].sections.find((s) => s.phase === 'LEARN')

    expect(learn?.rawText).toContain('Read aloud pages 4-7')
    expect(learn?.rawText).toContain('First ___, then ___')
    expect(learn?.rawText).not.toContain('Return to the Content Framing Question')
  })

  it('records the page a lesson starts on', () => {
    const result = parseWitAndWisdom(TEACHER_EDITION)
    expect(result.modules[0].lessons[0].pageStart).toBe(1)
    expect(result.modules[0].lessons[1].pageStart).toBe(2)
  })

  it('derives week labels when the document does not state them', () => {
    const lessons = Array.from(
      { length: 7 },
      (_, i) => `Lesson ${i + 1}\nLearn (60 min.)\nDo the work of lesson ${i + 1}.`,
    )
    const result = parseWitAndWisdom(doc([`Module 2: Outer Space\n${lessons.join('\n')}`]))

    const weeks = result.modules[0].lessons.map((lesson) => lesson.weekLabel)
    expect(weeks.slice(0, 5)).toEqual(Array(5).fill('Week 1'))
    expect(weeks.slice(5)).toEqual(['Week 2', 'Week 2'])
  })

  it('prefers an explicit week label from the document', () => {
    const result = parseWitAndWisdom(
      doc(['Module 1: Pacing\nWeek 4\nLesson 16\nLearn\nDo the work.']),
    )
    expect(result.modules[0].lessons[0].weekLabel).toBe('Week 4')
  })

  it('ignores lesson cross-references inside prose', () => {
    const result = parseWitAndWisdom(
      doc([
        `Module 1: Prose
Lesson 5
Learn (50 min.)
Students review the anchor chart. In Lesson 3, students recorded their first noticings, so refer back to that chart now.
Land (10 min.)
Close the lesson.`,
      ]),
    )

    expect(result.modules[0].lessons).toHaveLength(1)
    expect(result.modules[0].lessons[0].number).toBe(5)
  })

  it('reports low confidence for a document with no lesson structure', () => {
    const result = parseWitAndWisdom(
      doc(['A district memo about assessment windows and testing logistics.']),
    )

    expect(result.modules).toHaveLength(0)
    expect(result.confidence).toBeLessThan(CONFIDENCE_FLOOR)
    expect(result.notes.length).toBeGreaterThan(0)
  })

  it('reports high confidence for a real Teacher Edition', () => {
    expect(parseWitAndWisdom(TEACHER_EDITION).confidence).toBeGreaterThanOrEqual(
      CONFIDENCE_FLOOR,
    )
  })

  it('drops table-of-contents entries that carry no text', () => {
    const result = parseWitAndWisdom(
      doc([
        `Module 3: Contents
Lesson 1
Lesson 2
Lesson 3
Lesson 4
Learn (60 min.)
The only lesson with actual content.`,
      ]),
    )

    expect(result.modules[0].lessons).toHaveLength(1)
    expect(result.modules[0].lessons[0].number).toBe(4)
  })
})

import { describe, expect, it } from 'vitest'
import { extractDocument, kindFor } from '@/lib/parse/extract'
import { parseWitAndWisdom } from '@/lib/parse/witAndWisdom'
import { makeTextPdf, SAMPLE_TEACHER_EDITION } from './fixtures/makePdf'

describe('kindFor', () => {
  it('recognises supported types by mime type', () => {
    expect(kindFor('application/pdf', 'te.pdf')).toBe('pdf')
    expect(
      kindFor(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'guide.docx',
      ),
    ).toBe('docx')
  })

  it('falls back to the file extension when the browser sends no useful type', () => {
    expect(kindFor('application/octet-stream', 'pacing.xlsx')).toBe('xlsx')
    expect(kindFor('application/octet-stream', 'module1.PDF')).toBe('pdf')
  })

  it('rejects anything else', () => {
    expect(kindFor('image/png', 'scan.png')).toBeNull()
  })
})

describe('PDF extraction into the parser', () => {
  it('reads text page by page and finds the lesson structure', async () => {
    const pdf = makeTextPdf(SAMPLE_TEACHER_EDITION)

    const document = await extractDocument(pdf, 'application/pdf', 'te.pdf')
    expect(document.pages).toHaveLength(2)
    expect(document.pages[0].text).toContain('Module 1: A Great Heart')

    const result = parseWitAndWisdom(document)
    expect(result.modules).toHaveLength(1)
    expect(result.modules[0].lessons).toHaveLength(2)
    expect(result.modules[0].focusingQuestion).toBe('Why is the heart called a pump?')
    expect(result.modules[0].lessons[1].pageStart).toBe(2)
  })

  it('refuses an unsupported file', async () => {
    await expect(
      extractDocument(Buffer.from('not a document'), 'image/png', 'scan.png'),
    ).rejects.toThrow(/Unsupported file type/)
  })
})

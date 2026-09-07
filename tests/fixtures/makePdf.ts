/**
 * Builds a minimal, single-stream PDF from lines of text. Used to exercise the
 * PDF extraction path without checking a copyrighted Teacher Edition into the
 * repository.
 */
export function makeTextPdf(pages: string[][]): Buffer {
  const escape = (text: string) => text.replace(/([\\()])/g, '\\$1')

  const objects: string[] = []
  const pageObjectNumbers: number[] = []

  // 1 = catalog, 2 = pages tree, 3 = font; page objects and contents follow.
  let next = 4
  for (const lines of pages) {
    const contentNumber = next
    const pageNumber = next + 1
    next += 2

    const body = lines
      .map((line, index) => `${index === 0 ? '' : 'T*\n'}(${escape(line)}) Tj\n`)
      .join('')
    const stream = `BT\n/F1 11 Tf\n14 TL\n40 750 Td\n${body}ET`

    objects[contentNumber] =
      `${contentNumber} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
    objects[pageNumber] =
      `${pageNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNumber} 0 R >>\nendobj\n`
    pageObjectNumbers.push(pageNumber)
  }

  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
  objects[2] =
    `2 0 obj\n<< /Type /Pages /Count ${pageObjectNumbers.length} /Kids [` +
    `${pageObjectNumbers.map((n) => `${n} 0 R`).join(' ')}] >>\nendobj\n`
  objects[3] =
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let i = 1; i < next; i += 1) {
    offsets[i] = pdf.length
    pdf += objects[i]
  }

  const xrefStart = pdf.length
  pdf += `xref\n0 ${next}\n0000000000 65535 f \n`
  for (let i = 1; i < next; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${next} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`

  return Buffer.from(pdf, 'latin1')
}

/** A stand-in for a two-lesson W&W ELD Teacher Edition extract. */
export const SAMPLE_TEACHER_EDITION: string[][] = [
  [
    'Module 1: A Great Heart',
    'Focusing Question: Why is the heart called a pump?',
    'Lesson 1',
    'Welcome (5 min.)',
    'Display the heart image. Students name one thing they notice.',
    'Launch (5 min.)',
    'Introduce the Content Framing Question: What does a heart do?',
    'Learn (55 min.)',
    'Read aloud pages 4-7. Students record noticings in the Response Journal.',
    'Partners describe a change using the frame "First ___, then ___."',
    'Land (10 min.)',
    'Return to the Content Framing Question and record a shared response.',
    'Wrap (5 min.)',
    'Assign tonight volume of reading question.',
  ],
  [
    'Lesson 2',
    'Welcome (5 min.)',
    'Students revisit their Response Journal entry from Lesson 1.',
    'Learn (60 min.)',
    'Introduce the vocabulary word circulate. Students act out the word.',
    'Land (10 min.)',
    'Students answer the Content Framing Question in one sentence.',
  ],
]

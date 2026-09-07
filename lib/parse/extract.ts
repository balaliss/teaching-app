/**
 * Turns an uploaded file into plain text with page boundaries preserved, so the
 * structural parser can record which pages a lesson lives on.
 */

export interface ExtractedPage {
  page: number
  text: string
}

export interface ExtractedDocument {
  pages: ExtractedPage[]
}

export const SUPPORTED_MIME_TYPES: Record<string, 'pdf' | 'docx' | 'xlsx'> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xlsx',
}

export function kindFor(mimeType: string, fileName: string): 'pdf' | 'docx' | 'xlsx' | null {
  const byMime = SUPPORTED_MIME_TYPES[mimeType]
  if (byMime) return byMime
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx'
  return null
}

export async function extractDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractedDocument> {
  const kind = kindFor(mimeType, fileName)
  if (!kind) {
    throw new Error('Unsupported file type. Upload a PDF, DOCX or XLSX.')
  }

  if (kind === 'pdf') return extractPdf(buffer)
  if (kind === 'docx') return extractDocx(buffer)
  return extractXlsx(buffer)
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const { text } = await extractText(pdf, { mergePages: false })
  const pageTexts = Array.isArray(text) ? text : [text]
  return {
    pages: pageTexts.map((value, index) => ({ page: index + 1, text: value ?? '' })),
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const mammoth = await import('mammoth')
  const { value } = await mammoth.extractRawText({ buffer })
  return { pages: [{ page: 1, text: value }] }
}

async function extractXlsx(buffer: Buffer): Promise<ExtractedDocument> {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  // One "page" per worksheet: a pacing guide is usually one sheet per grade or module.
  const pages: ExtractedPage[] = []
  workbook.eachSheet((sheet, sheetId) => {
    const lines: string[] = [sheet.name]
    sheet.eachRow((row) => {
      const cells = Array.isArray(row.values) ? row.values.slice(1) : []
      const line = cells
        .map((cell) => (cell == null ? '' : String(typeof cell === 'object' && 'text' in cell ? cell.text : cell)))
        .join('\t')
        .trim()
      if (line) lines.push(line)
    })
    pages.push({ page: sheetId, text: lines.join('\n') })
  })

  return { pages: pages.length > 0 ? pages : [{ page: 1, text: '' }] }
}

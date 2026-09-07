import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { createCurriculum, processCurriculum } from '@/lib/ingest'

/** Uploads are handled by a route rather than a server action so the file
 *  streams straight through as multipart form data. */
export async function POST(request: Request) {
  const user = await requireUser()

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the upload.' }, { status: 400 })
  }

  const file = form.get('file')
  const title = String(form.get('title') ?? '').trim()
  const gradeBand = String(form.get('gradeBand') ?? '').trim() || null

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: 'Give the curriculum a title.' }, { status: 400 })
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const id = await createCurriculum({
      userId: user.id,
      title,
      gradeBand,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      bytes,
    })

    // Parsing happens inline: a Teacher Edition takes a few seconds and this
    // keeps the app deployable anywhere without a queue worker.
    await processCurriculum(id).catch(() => undefined)

    return NextResponse.json({ id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed.' },
      { status: 400 },
    )
  }
}

export const maxDuration = 300

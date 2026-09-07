'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Field, inputClass } from '@/components/ui'

export function UploadForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/curricula', { method: 'POST', body: form })
    const payload = (await response.json()) as { id?: string; error?: string }

    if (!response.ok || !payload.id) {
      setError(payload.error ?? 'Upload failed.')
      setPending(false)
      return
    }

    router.push(`/curricula/${payload.id}/review`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="font-medium">Upload a curriculum</h2>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Title">
          <input
            name="title"
            required
            maxLength={160}
            className={inputClass}
            placeholder="Grade 3 ELD — Module 1"
          />
        </Field>
        <Field label="Grade band" hint="optional">
          <input name="gradeBand" maxLength={40} className={inputClass} placeholder="Grade 3" />
        </Field>
        <Field label="File" hint="PDF, DOCX or XLSX">
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.docx,.xlsx,.xls"
            className={`${inputClass} py-1`}
          />
        </Field>
      </div>
      <p className="text-xs text-muted">
        Teacher Editions are licensed material. Uploads are private to your account and are never
        shared with other teachers; lesson text is sent to the Claude API when you generate a grid.
      </p>
      <Button type="submit" disabled={pending}>
        {pending ? 'Uploading and reading…' : 'Upload and parse'}
      </Button>
    </form>
  )
}

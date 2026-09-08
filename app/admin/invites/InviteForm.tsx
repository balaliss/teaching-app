'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Field, inputClass } from '@/components/ui'
import { createInviteAction } from '@/app/admin/invites/actions'

export function InviteForm() {
  const router = useRouter()
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLink(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const result = await createInviteAction({
      email: String(form.get('email') ?? ''),
      role: String(form.get('role') ?? 'TEACHER'),
      days: Number(form.get('days') ?? 14),
    })

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setLink(`${window.location.origin}/register?code=${result.code}`)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="font-medium">Make an invite link</h2>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Their email" hint="optional — only they can use the link">
          <input name="email" type="email" className={inputClass} placeholder="teacher@school.org" />
        </Field>
        <Field label="Role">
          <select name="role" className={inputClass} defaultValue="TEACHER">
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Admin</option>
          </select>
        </Field>
        <Field label="Good for (days)">
          <input name="days" type="number" min={1} max={90} defaultValue={14} className={inputClass} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Making it…' : 'Create invite'}
      </Button>
      {link ? (
        <Alert kind="success">
          Send this link to them:
          <br />
          <code className="break-all font-mono text-xs">{link}</code>
        </Alert>
      ) : null}
    </form>
  )
}

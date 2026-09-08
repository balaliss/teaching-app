'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Alert, Button, Field, inputClass } from '@/components/ui'
import { registerAction } from '@/app/register/actions'

export function RegisterForm({ code }: { code?: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const result = await registerAction({
      code: String(form.get('code') ?? ''),
      email,
      name: String(form.get('name') ?? ''),
      password,
    })

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    await signIn('credentials', { email, password, redirect: false })
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      <Field label="Invite code" hint="from your invite link">
        <input name="code" required defaultValue={code} className={inputClass} />
      </Field>
      <Field label="Your name">
        <input name="name" required autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Pick a password" hint="at least 10 characters">
        <input
          name="password"
          type="password"
          required
          minLength={10}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? 'Setting up…' : 'Create account'}
      </Button>
    </form>
  )
}

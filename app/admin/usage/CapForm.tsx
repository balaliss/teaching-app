'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, inputClass } from '@/components/ui'
import { setCapAction } from '@/app/admin/usage/actions'

export function CapForm({ userId, cap }: { userId: string; cap: number | null }) {
  const router = useRouter()
  const [value, setValue] = useState(cap === null ? '' : String(cap))
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    await setCapAction({ userId, cap: value.trim() === '' ? null : Number(value) })
    setPending(false)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="unlimited"
        inputMode="numeric"
        className={`${inputClass} w-28`}
      />
      <Button variant="secondary" type="submit" disabled={pending} className="!px-2 !py-1 !text-xs">
        {pending ? '…' : 'Set'}
      </Button>
    </form>
  )
}

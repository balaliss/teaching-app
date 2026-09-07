'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: '/login' })}
      className="text-muted hover:text-ink hover:underline"
    >
      Sign out
    </button>
  )
}

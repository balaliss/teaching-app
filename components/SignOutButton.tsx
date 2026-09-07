'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ redirectTo: '/login' })}
      className="text-neutral-500 hover:text-ink hover:underline"
    >
      Sign out
    </button>
  )
}

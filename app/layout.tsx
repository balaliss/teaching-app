import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { currentUser } from '@/lib/session'
import { SignOutButton } from '@/components/SignOutButton'

export const metadata: Metadata = {
  title: 'Teaching App — W&W ELD lesson grids',
  description:
    'Turn Wit & Wisdom ELD Teacher Edition materials into explicit, printable lesson instruction grids.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  return (
    <html lang="en">
      <body className="min-h-screen">
        {user ? (
          <header className="no-print border-b border-neutral-300 bg-white">
            <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
              <Link href="/" className="font-semibold text-accent">
                Teaching App
              </Link>
              <Link href="/curricula" className="hover:underline">
                Curricula
              </Link>
              <Link href="/settings/templates" className="hover:underline">
                Grid layout
              </Link>
              {user.role === 'ADMIN' ? (
                <>
                  <Link href="/admin/invites" className="hover:underline">
                    Invites
                  </Link>
                  <Link href="/admin/usage" className="hover:underline">
                    Usage
                  </Link>
                </>
              ) : null}
              <span className="ml-auto text-neutral-500">{user.email}</span>
              <SignOutButton />
            </nav>
          </header>
        ) : null}
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}

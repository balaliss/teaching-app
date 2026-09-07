import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import './globals.css'
import { currentUser } from '@/lib/session'
import { SignOutButton } from '@/components/SignOutButton'
import { ThemeToggle } from '@/components/ThemeToggle'

// Runs before paint so a saved dark-mode preference never flashes light first.
const THEME_BOOT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export const metadata: Metadata = {
  title: 'Teaching App — W&W ELD lesson grids',
  description:
    'Turn Wit & Wisdom ELD Teacher Edition materials into explicit, printable lesson instruction grids.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser()

  return (
    <html lang="en">
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-screen bg-paper text-ink">
        {user ? (
          <header className="no-print border-b border-border bg-surface">
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
              <span className="ml-auto text-muted">{user.email}</span>
              <ThemeToggle />
              <SignOutButton />
            </nav>
          </header>
        ) : null}
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </body>
    </html>
  )
}

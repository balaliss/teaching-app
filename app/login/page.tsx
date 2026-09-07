import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { LoginForm } from '@/app/login/LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await currentUser()
  if (user) redirect('/')
  const { next } = await searchParams

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Accounts are invite-only. Ask an admin for an invite link.
      </p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-4 text-sm text-muted">
        Have an invite code?{' '}
        <Link href="/register" className="text-accent hover:underline">
          Create your account
        </Link>
      </p>
    </div>
  )
}

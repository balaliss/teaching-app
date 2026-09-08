import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/session'
import { RegisterForm } from '@/app/register/RegisterForm'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const user = await currentUser()
  if (user) redirect('/')
  const { code } = await searchParams

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Make your account</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Paste your invite code below, then pick a password. That&apos;s it.
      </p>
      <div className="mt-6">
        <RegisterForm code={code} />
      </div>
    </div>
  )
}

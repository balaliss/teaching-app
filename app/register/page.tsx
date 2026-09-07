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
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-1 text-sm text-neutral-600">
        You need an invite code. Paste it below along with the email it was sent to.
      </p>
      <div className="mt-6">
        <RegisterForm code={code} />
      </div>
    </div>
  )
}

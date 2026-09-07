import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export async function currentUser() {
  const session = await auth()
  return session?.user ?? null
}

/** Server-component guard: returns the signed-in user or redirects to /login. */
export async function requireUser() {
  const user = await currentUser()
  if (!user?.id) redirect('/login')
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'ADMIN') redirect('/')
  return user
}

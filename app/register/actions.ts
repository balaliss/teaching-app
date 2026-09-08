'use server'

import { z } from 'zod'
import { redeemInvite } from '@/lib/invites'

const schema = z.object({
  code: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(10).max(200),
})

export async function registerAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Something is missing — check the email looks right and the password is at least 10 characters.',
    }
  }

  const result = await redeemInvite(parsed.data)
  return result.ok ? { ok: true } : { ok: false, error: result.error }
}

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

const schema = z.object({
  userId: z.string().min(1),
  /** null means unlimited. */
  cap: z.number().int().min(0).max(1_000_000_000).nullable(),
})

export async function setCapAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Enter a whole number of tokens, or leave blank.' }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { monthlyTokenCap: parsed.data.cap },
  })

  revalidatePath('/admin/usage')
  return { ok: true }
}

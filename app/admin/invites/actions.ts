'use server'

import { z } from 'zod'
import { prisma } from '@/lib/db'
import { newInviteCode } from '@/lib/invites'
import { requireAdmin } from '@/lib/session'

const schema = z.object({
  email: z.string().email().or(z.literal('')),
  role: z.enum(['TEACHER', 'ADMIN']),
  days: z.number().int().min(1).max(90),
})

export async function createInviteAction(
  input: unknown,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const admin = await requireAdmin()

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Check the invite details and try again.' }

  const expiresAt = new Date(Date.now() + parsed.data.days * 24 * 60 * 60 * 1000)
  const invite = await prisma.invite.create({
    data: {
      code: newInviteCode(),
      email: parsed.data.email || null,
      role: parsed.data.role,
      expiresAt,
      issuedById: admin.id,
    },
  })

  return { ok: true, code: invite.code }
}

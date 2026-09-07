import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'

export function newInviteCode(): string {
  // URL-safe, unambiguous, and short enough to paste into an email.
  return randomBytes(12).toString('base64url')
}

export type RedeemResult =
  | { ok: true; userId: string }
  | { ok: false; error: string }

/**
 * Redeems an invite and creates the teacher account in one transaction, so a
 * code can never be used twice.
 */
export async function redeemInvite(input: {
  code: string
  email: string
  name: string
  password: string
}): Promise<RedeemResult> {
  const email = input.email.trim().toLowerCase()

  const invite = await prisma.invite.findUnique({ where: { code: input.code.trim() } })
  if (!invite) return { ok: false, error: 'That invite code is not valid.' }
  if (invite.usedAt) return { ok: false, error: 'That invite code has already been used.' }
  if (invite.expiresAt < new Date()) return { ok: false, error: 'That invite code has expired.' }
  if (invite.email && invite.email.toLowerCase() !== email) {
    return { ok: false, error: 'That invite was issued to a different email address.' }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { ok: false, error: 'An account already exists for that email.' }

  const passwordHash = await bcrypt.hash(input.password, 12)

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name: input.name.trim() || null,
          passwordHash,
          role: invite.role,
          monthlyTokenCap: env.defaultMonthlyTokenCap,
        },
      })

      // updateMany with usedAt: null makes the redemption atomic — a second
      // concurrent redemption updates 0 rows and throws below.
      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date(), usedByUserId: created.id },
      })
      if (claimed.count !== 1) throw new Error('invite-race')

      return created
    })

    return { ok: true, userId: user.id }
  } catch (error) {
    if (error instanceof Error && error.message === 'invite-race') {
      return { ok: false, error: 'That invite code has already been used.' }
    }
    throw error
  }
}

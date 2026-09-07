/**
 * Per-teacher usage caps. Generation runs on one shared server-side Claude key,
 * so each account gets a monthly token allowance. The cap is checked *before*
 * the API call and usage is recorded after, so a teacher can never run up an
 * unbounded bill on the shared key.
 */
import { prisma } from '@/lib/db'

export interface QuotaStatus {
  used: number
  cap: number | null
  remaining: number | null
  exceeded: boolean
  periodStart: Date
}

export function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

export async function quotaStatus(userId: string): Promise<QuotaStatus> {
  const periodStart = monthStart()

  const [user, usage] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { monthlyTokenCap: true },
    }),
    prisma.usageEvent.aggregate({
      where: { userId, createdAt: { gte: periodStart } },
      _sum: { inputTokens: true, outputTokens: true },
    }),
  ])

  const used = (usage._sum.inputTokens ?? 0) + (usage._sum.outputTokens ?? 0)
  const cap = user.monthlyTokenCap

  return {
    used,
    cap,
    remaining: cap === null ? null : Math.max(cap - used, 0),
    exceeded: cap !== null && used >= cap,
    periodStart,
  }
}

export class QuotaExceededError extends Error {
  constructor(public readonly status: QuotaStatus) {
    super(
      `Monthly generation limit reached (${status.used.toLocaleString()} of ${status.cap?.toLocaleString()} tokens used). ` +
        'Ask an admin to raise your limit, or wait until next month.',
    )
    this.name = 'QuotaExceededError'
  }
}

/** Throws QuotaExceededError if the user has no allowance left this month. */
export async function assertQuota(userId: string): Promise<QuotaStatus> {
  const status = await quotaStatus(userId)
  if (status.exceeded) throw new QuotaExceededError(status)
  return status
}

export async function recordUsage(input: {
  userId: string
  kind: string
  model: string
  inputTokens: number
  outputTokens: number
  gridId?: string | null
}): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      gridId: input.gridId ?? null,
    },
  })
}

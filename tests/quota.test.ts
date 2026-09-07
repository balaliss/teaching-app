import { describe, expect, it } from 'vitest'
import { monthStart, QuotaExceededError } from '@/lib/quota'

describe('monthStart', () => {
  it('returns the first instant of the current UTC month', () => {
    const start = monthStart(new Date('2026-03-17T22:45:00.000Z'))
    expect(start.toISOString()).toBe('2026-03-01T00:00:00.000Z')
  })

  it('does not roll back a month for an early-in-the-month timestamp', () => {
    const start = monthStart(new Date('2026-01-01T00:00:00.000Z'))
    expect(start.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('QuotaExceededError', () => {
  it('tells the teacher what they used and what to do', () => {
    const error = new QuotaExceededError({
      used: 2_000_000,
      cap: 2_000_000,
      remaining: 0,
      exceeded: true,
      periodStart: monthStart(new Date('2026-03-01T00:00:00.000Z')),
    })

    expect(error.message).toContain('2,000,000')
    expect(error.message).toContain('Ask an admin')
  })
})

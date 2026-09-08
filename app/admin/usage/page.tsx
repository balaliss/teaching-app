import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { gridsFromTokens, monthStart } from '@/lib/quota'
import { Card, PageHeading } from '@/components/ui'
import { CapForm } from '@/app/admin/usage/CapForm'

export default async function UsagePage() {
  await requireAdmin()

  const periodStart = monthStart()

  const [users, usage] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: 'asc' },
      select: { id: true, email: true, name: true, role: true, monthlyTokenCap: true },
    }),
    prisma.usageEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: periodStart } },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true,
    }),
  ])

  const byUser = new Map(
    usage.map((row) => [
      row.userId,
      {
        tokens: (row._sum.inputTokens ?? 0) + (row._sum.outputTokens ?? 0),
        calls: row._count,
      },
    ]),
  )

  return (
    <div className="space-y-6">
      <PageHeading
        title="Spending"
        subtitle={`Everyone's grids are written on one shared Claude account, so each teacher gets a monthly allowance. This month starts ${periodStart.toISOString().slice(0, 10)}. Roughly 13,000 tokens per grid.`}
      />

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-500">
            <tr>
              <th className="py-1">Teacher</th>
              <th className="py-1">Role</th>
              <th className="py-1">Grids written</th>
              <th className="py-1">Used this month</th>
              <th className="py-1">Monthly allowance</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const row = byUser.get(user.id)
              const tokens = row?.tokens ?? 0
              const over = user.monthlyTokenCap !== null && tokens >= user.monthlyTokenCap
              return (
                <tr key={user.id} className="border-t border-neutral-200">
                  <td className="py-2">
                    {user.name ?? '—'}
                    <div className="text-xs text-neutral-500">{user.email}</div>
                  </td>
                  <td className="py-2">{user.role}</td>
                  <td className="py-2">{row?.calls ?? 0}</td>
                  <td className={`py-2 ${over ? 'font-medium text-red-700' : ''}`}>
                    ~{gridsFromTokens(tokens)} grids
                    {over ? ' — out of allowance' : ''}
                  </td>
                  <td className="py-2">
                    <CapForm userId={user.id} cap={user.monthlyTokenCap} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

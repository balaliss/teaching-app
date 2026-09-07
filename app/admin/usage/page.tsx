import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { monthStart } from '@/lib/quota'
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
        title="Usage"
        subtitle={`Generation runs on the shared server key. Month starting ${periodStart.toISOString().slice(0, 10)} (UTC).`}
      />

      <Card>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1">Teacher</th>
              <th className="py-1">Role</th>
              <th className="py-1">Calls</th>
              <th className="py-1">Tokens this month</th>
              <th className="py-1">Monthly cap</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const row = byUser.get(user.id)
              const tokens = row?.tokens ?? 0
              const over = user.monthlyTokenCap !== null && tokens >= user.monthlyTokenCap
              return (
                <tr key={user.id} className="border-t border-border">
                  <td className="py-2">
                    {user.name ?? '—'}
                    <div className="text-xs text-muted">{user.email}</div>
                  </td>
                  <td className="py-2">{user.role}</td>
                  <td className="py-2">{row?.calls ?? 0}</td>
                  <td className={`py-2 ${over ? 'font-medium text-red-600 dark:text-red-400' : ''}`}>
                    {tokens.toLocaleString()}
                    {over ? ' (at limit)' : ''}
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

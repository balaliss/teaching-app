import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { gridsFromTokens, quotaStatus } from '@/lib/quota'
import { Card, LinkButton, PageHeading } from '@/components/ui'

export default async function HomePage() {
  const user = await requireUser()

  const [curricula, quota, recentGrids] = await Promise.all([
    prisma.curriculum.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, parseStatus: true },
    }),
    quotaStatus(user.id),
    prisma.generatedGrid.findMany({
      where: { lesson: { module: { curriculum: { ownerId: user.id } } }, status: 'READY' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        lesson: { select: { id: true, title: true, weekLabel: true } },
        level: { select: { name: true } },
      },
    }),
  ])

  return (
    <div className="space-y-6">
      <PageHeading
        title={`Hello${user.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        subtitle="Add your Teacher Edition, pick the lesson you&apos;re teaching, and print the grid."
      >
        <LinkButton href="/curricula" variant="primary">
          Go to my curriculum
        </LinkButton>
      </PageHeading>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <h2 className="font-medium">Your Teacher Editions</h2>
          {curricula.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">
              Nothing here yet.{' '}
              <Link href="/curricula" className="text-accent hover:underline">
                Add one
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {curricula.map((curriculum) => (
                <li key={curriculum.id}>
                  <Link href={`/curricula/${curriculum.id}`} className="text-accent hover:underline">
                    {curriculum.title}
                  </Link>
                  <span className="ml-2 text-xs text-neutral-500">{curriculum.parseStatus}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-medium">Grids you made recently</h2>
          {recentGrids.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600">You haven&apos;t made any grids yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {recentGrids.map((grid) => (
                <li key={grid.id}>
                  <Link href={`/lessons/${grid.lesson.id}`} className="text-accent hover:underline">
                    {grid.lesson.weekLabel ? `${grid.lesson.weekLabel} · ` : ''}
                    {grid.lesson.title}
                  </Link>
                  <span className="ml-2 text-xs text-neutral-500">{grid.level.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-medium">This month&apos;s allowance</h2>
          {quota.cap === null ? (
            <p className="mt-2 text-sm text-neutral-600">
              No limit on your account. You&apos;ve made about {gridsFromTokens(quota.used)} grids
              so far.
            </p>
          ) : (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded bg-neutral-200">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, (quota.used / quota.cap) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                About {gridsFromTokens(quota.cap - quota.used)} more grids this month.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

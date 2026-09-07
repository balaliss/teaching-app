import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { quotaStatus } from '@/lib/quota'
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
        subtitle="Upload a Teacher Edition, pick the lesson you're teaching, and print the grid."
      >
        <LinkButton href="/curricula" variant="primary">
          Go to curricula
        </LinkButton>
      </PageHeading>

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <h2 className="font-medium">Your curricula</h2>
          {curricula.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Nothing uploaded yet.{' '}
              <Link href="/curricula" className="text-accent hover:underline">
                Upload one
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
                  <span className="ml-2 text-xs text-muted">{curriculum.parseStatus}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-medium">Recent grids</h2>
          {recentGrids.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No grids generated yet.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {recentGrids.map((grid) => (
                <li key={grid.id}>
                  <Link href={`/lessons/${grid.lesson.id}`} className="text-accent hover:underline">
                    {grid.lesson.weekLabel ? `${grid.lesson.weekLabel} · ` : ''}
                    {grid.lesson.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted">{grid.level.name}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-medium">This month&apos;s generation limit</h2>
          {quota.cap === null ? (
            <p className="mt-2 text-sm text-muted">
              No limit set. {quota.used.toLocaleString()} tokens used so far.
            </p>
          ) : (
            <>
              <div className="mt-3 h-2 w-full overflow-hidden rounded bg-surface-muted">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, (quota.used / quota.cap) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted">
                {quota.used.toLocaleString()} of {quota.cap.toLocaleString()} tokens used.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

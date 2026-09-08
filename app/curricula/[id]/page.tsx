import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { ownedCurriculum } from '@/lib/access'
import { Alert, Card, EmptyState, LinkButton, PageHeading } from '@/components/ui'

export default async function CurriculumPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const curriculum = await ownedCurriculum(id, user.id)

  const modules = await prisma.module.findMany({
    where: { curriculumId: curriculum.id },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          number: true,
          title: true,
          weekLabel: true,
          _count: { select: { grids: true } },
        },
      },
    },
  })

  // Lessons are grouped by the week label so a teacher can jump straight to the
  // week they are teaching.
  const weeks = new Map<string, typeof modules[number]['lessons']>()
  for (const module of modules) {
    for (const lesson of module.lessons) {
      const key = `${module.title} · ${lesson.weekLabel ?? 'Unscheduled'}`
      const bucket = weeks.get(key) ?? []
      bucket.push(lesson)
      weeks.set(key, bucket)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title={curriculum.title}
        subtitle={[curriculum.gradeBand, curriculum.sourceFileName].filter(Boolean).join(' · ')}
      >
        <LinkButton href={`/curricula/${curriculum.id}/review`}>Edit lessons</LinkButton>
        <LinkButton href={`/settings/levels?curriculum=${curriculum.id}`}>
          Language levels
        </LinkButton>
      </PageHeading>

      {curriculum.parseStatus === 'FAILED' ? (
        <Alert>
          {curriculum.parseError ?? "We couldn't read this file."} You can still type the modules and
          lessons in yourself on the{' '}
          <Link href={`/curricula/${curriculum.id}/review`} className="underline">
            lessons page
          </Link>
          .
        </Alert>
      ) : null}

      {curriculum.parseStatus === 'NEEDS_REVIEW' ? (
        <Alert kind="info">
          We&apos;ve read your PDF but you haven&apos;t checked it yet.{' '}
          <Link href={`/curricula/${curriculum.id}/review`} className="underline">
            Have a look
          </Link>{' '}
          before you make any grids — it only takes a minute.
        </Alert>
      ) : null}

      {weeks.size === 0 ? (
        <EmptyState
          title="No lessons yet"
          body="We found no lessons in your file. You can type them in yourself, or try reading the PDF again."
          action={<LinkButton href={`/curricula/${curriculum.id}/review`} variant="primary">Open the lessons page</LinkButton>}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {[...weeks.entries()].map(([label, lessons]) => (
            <Card key={label}>
              <h2 className="font-medium">{label}</h2>
              <ul className="mt-2 divide-y divide-neutral-200 text-sm">
                {lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between py-1.5">
                    <Link href={`/lessons/${lesson.id}`} className="text-accent hover:underline">
                      {lesson.number ? `Lesson ${lesson.number}: ` : ''}
                      {lesson.title}
                    </Link>
                    <span className="text-xs text-neutral-500">
                      {lesson._count.grids > 0
                        ? `${lesson._count.grids} grid${lesson._count.grids === 1 ? '' : 's'} made`
                        : 'no grid yet'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

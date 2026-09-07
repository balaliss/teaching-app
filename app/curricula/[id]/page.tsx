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
        <LinkButton href={`/curricula/${curriculum.id}/review`}>Edit structure</LinkButton>
        <LinkButton href={`/settings/levels?curriculum=${curriculum.id}`}>
          Proficiency levels
        </LinkButton>
      </PageHeading>

      {curriculum.parseStatus === 'FAILED' ? (
        <Alert>
          {curriculum.parseError ?? 'This document could not be read.'} You can still build the
          structure by hand on the{' '}
          <Link href={`/curricula/${curriculum.id}/review`} className="underline">
            structure page
          </Link>
          .
        </Alert>
      ) : null}

      {curriculum.parseStatus === 'NEEDS_REVIEW' ? (
        <Alert kind="info">
          The parsed structure has not been confirmed yet.{' '}
          <Link href={`/curricula/${curriculum.id}/review`} className="underline">
            Check it
          </Link>{' '}
          before generating grids.
        </Alert>
      ) : null}

      {weeks.size === 0 ? (
        <EmptyState
          title="No lessons yet"
          body="Add modules and lessons on the structure page, or re-parse the uploaded file."
          action={<LinkButton href={`/curricula/${curriculum.id}/review`} variant="primary">Open structure page</LinkButton>}
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
                      {lesson._count.grids > 0 ? `${lesson._count.grids} grid(s)` : 'not generated'}
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

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { Alert, Card, EmptyState, LinkButton, PageHeading } from '@/components/ui'
import { LevelsEditor } from '@/app/settings/levels/LevelsEditor'

export default async function LevelsPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculum?: string }>
}) {
  const user = await requireUser()
  const { curriculum: requested } = await searchParams

  const curricula = await prisma.curriculum.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true },
  })

  if (curricula.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeading title="Language levels" />
        <EmptyState
          title="Nothing to set up yet"
          body="You set levels for each Teacher Edition. Add one first."
          action={<LinkButton href="/curricula" variant="primary">Add a Teacher Edition</LinkButton>}
        />
      </div>
    )
  }

  const selectedId = curricula.find((c) => c.id === requested)?.id ?? curricula[0].id
  const levels = await prisma.proficiencyLevel.findMany({
    where: { curriculumId: selectedId },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="space-y-6">
      <PageHeading
        title="Language levels"
        subtitle="The levels your school uses. Each lesson gets one grid per level. Same lesson, different amounts of help."
      />

      <Card>
        <h2 className="mb-2 text-sm font-medium">Which Teacher Edition?</h2>
        <div className="flex flex-wrap gap-2">
          {curricula.map((curriculum) => (
            <Link
              key={curriculum.id}
              href={`/settings/levels?curriculum=${curriculum.id}`}
              className={`rounded border px-3 py-1.5 text-sm ${
                curriculum.id === selectedId
                  ? 'border-accent bg-accent text-white'
                  : 'border-neutral-400 bg-white hover:bg-neutral-50'
              }`}
            >
              {curriculum.title}
            </Link>
          ))}
        </div>
      </Card>

      <Alert kind="info">
        <strong>The description matters.</strong> Claude reads it to decide how much help to build
        in. Say what these students can already do alone. Say what they still need help with. Be
        clear here, or all your levels will read the same.
      </Alert>

      <LevelsEditor
        curriculumId={selectedId}
        initialLevels={levels.map((level) => ({
          id: level.id,
          name: level.name,
          description: level.description,
          deleted: false,
        }))}
      />
    </div>
  )
}

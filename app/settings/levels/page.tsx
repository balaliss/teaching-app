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
          body="Levels are set per Teacher Edition, so add one of those first."
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
        subtitle="The levels your district uses. Every grid gets written once for each one, so a lesson comes out three times with different amounts of support."
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
        <strong>The description matters.</strong> It&apos;s what Claude reads to decide how much
        support to build in. Be specific about what these students can already do on their own, and
        what they still need help with. Vague description in, vague differences out.
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

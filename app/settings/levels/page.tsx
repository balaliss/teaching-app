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
        <PageHeading title="Proficiency levels" />
        <EmptyState
          title="No curricula yet"
          body="Proficiency levels are set per curriculum, so upload one first."
          action={<LinkButton href="/curricula" variant="primary">Upload a curriculum</LinkButton>}
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
        title="Proficiency levels"
        subtitle="Set the bands your district uses. Each band gets its own version of every grid."
      />

      <Card>
        <h2 className="mb-2 text-sm font-medium">Curriculum</h2>
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
        The description is what Claude reads to decide how much to scaffold, so be concrete: what
        students at this band can already do, and what support they still need.
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

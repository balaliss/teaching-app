import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { ownedCurriculum } from '@/lib/access'
import { LinkButton, PageHeading } from '@/components/ui'
import { StructureEditor } from '@/app/curricula/[id]/review/StructureEditor'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const curriculum = await ownedCurriculum(id, user.id)

  const modules = await prisma.module.findMany({
    where: { curriculumId: curriculum.id },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: { sections: { orderBy: { order: 'asc' } } },
      },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeading
        title="Check what we found"
        subtitle={`${curriculum.title} — these are the modules and lessons we found in your PDF. Fix anything that looks wrong. Claude reads exactly what you see here when it writes your grids.`}
      >
        <LinkButton href={`/curricula/${curriculum.id}`} variant="primary">
          Done — go to my lessons
        </LinkButton>
      </PageHeading>

      <StructureEditor
        curriculumId={curriculum.id}
        parseStatus={curriculum.parseStatus}
        parseError={curriculum.parseError}
        initialModules={modules.map((module) => ({
          id: module.id,
          number: module.number,
          title: module.title,
          focusingQuestion: module.focusingQuestion,
          deleted: false,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            number: lesson.number,
            title: lesson.title,
            weekLabel: lesson.weekLabel,
            deleted: false,
            sections: lesson.sections.map((section) => ({
              id: section.id,
              phase: section.phase,
              heading: section.heading,
              rawText: section.rawText,
              deleted: false,
            })),
          })),
        }))}
      />
    </div>
  )
}

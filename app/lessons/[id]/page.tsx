import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { ownedLesson } from '@/lib/access'
import { resolveTemplate } from '@/lib/grids'
import { readTemplateShape } from '@/lib/gridTemplate'
import { quotaStatus } from '@/lib/quota'
import { Alert, LinkButton, PageHeading } from '@/components/ui'
import { GridWorkspace } from '@/app/lessons/[id]/GridWorkspace'

// Grid generation is a server action invoked from this page, so this page's
// function is the one that has to stay alive for the length of a Claude call.
export const maxDuration = 60

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const lesson = await ownedLesson(id, user.id)

  const template = await resolveTemplate(user.id)
  const shape = readTemplateShape(template)

  const [grids, quota] = await Promise.all([
    prisma.generatedGrid.findMany({
      where: { lessonId: lesson.id, templateId: template.id },
      include: { cells: true },
    }),
    quotaStatus(user.id),
  ])

  const levels = lesson.module.curriculum.levels

  return (
    <div className="space-y-6">
      <PageHeading
        title={`${lesson.number ? `Lesson ${lesson.number}: ` : ''}${lesson.title}`}
        subtitle={[
          lesson.module.curriculum.title,
          lesson.module.number ? `Module ${lesson.module.number}` : lesson.module.title,
          lesson.weekLabel,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <LinkButton href={`/lessons/${lesson.id}/print`}>Print this</LinkButton>
        <LinkButton href={`/curricula/${lesson.module.curriculumId}`}>Back to my lessons</LinkButton>
      </PageHeading>

      {lesson.module.focusingQuestion ? (
        <p className="text-sm text-neutral-700">
          <span className="font-medium">Focusing Question:</span>{' '}
          {lesson.module.focusingQuestion}
        </p>
      ) : null}

      {levels.length === 0 ? (
        <Alert>
          You haven&apos;t set any language levels for this curriculum yet.{' '}
          <Link
            href={`/settings/levels?curriculum=${lesson.module.curriculumId}`}
            className="underline"
          >
            Set them up
          </Link>{' '}
          first — each level gets its own version of the grid.
        </Alert>
      ) : (
        <GridWorkspace
          lessonId={lesson.id}
          templateName={template.name}
          shape={shape}
          levels={levels.map((level) => ({
            id: level.id,
            name: level.name,
            description: level.description,
          }))}
          grids={grids.map((grid) => ({
            id: grid.id,
            levelId: grid.levelId,
            status: grid.status,
            error: grid.error,
            model: grid.model,
            generatedAt: grid.generatedAt?.toISOString() ?? null,
            cells: grid.cells.map((cell) => ({
              rowKey: cell.rowKey,
              columnKey: cell.columnKey,
              content: cell.content,
              teacherEdited: cell.teacherEdited,
            })),
          }))}
          quota={{ used: quota.used, cap: quota.cap }}
        />
      )}

      <details className="rounded border border-neutral-300 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          What the Teacher Edition says for this lesson ({lesson.sections.length} part
          {lesson.sections.length === 1 ? '' : 's'})
        </summary>
        <div className="mt-3 space-y-3">
          {lesson.sections.length === 0 ? (
            <p className="text-neutral-600">
              We didn&apos;t pick up any text for this lesson, so there&apos;s nothing for Claude to
              work from. Add it on the{' '}
              <Link
                href={`/curricula/${lesson.module.curriculumId}/review`}
                className="text-accent underline"
              >
                lessons page
              </Link>
              .
            </p>
          ) : (
            lesson.sections.map((section) => (
              <div key={section.id}>
                <p className="font-medium">
                  {section.phase} — {section.heading}
                </p>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 font-mono text-xs">
                  {section.rawText}
                </pre>
              </div>
            ))
          )}
        </div>
      </details>
    </div>
  )
}

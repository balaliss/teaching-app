import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { ownedLesson } from '@/lib/access'
import { resolveTemplate } from '@/lib/grids'
import { readTemplateShape } from '@/lib/gridTemplate'
import { PrintButton } from '@/app/lessons/[id]/print/PrintButton'

/**
 * The printable deliverable: one landscape page per proficiency level, so a
 * teacher can print the band they are teaching or the whole set for a binder.
 */
export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ level?: string }>
}) {
  const user = await requireUser()
  const { id } = await params
  const { level: levelFilter } = await searchParams

  const lesson = await ownedLesson(id, user.id)
  const template = await resolveTemplate(user.id)
  const shape = readTemplateShape(template)

  const grids = await prisma.generatedGrid.findMany({
    where: {
      lessonId: lesson.id,
      templateId: template.id,
      status: 'READY',
      ...(levelFilter ? { levelId: levelFilter } : {}),
    },
    include: { cells: true, level: true },
    orderBy: { level: { order: 'asc' } },
  })

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3 text-sm">
        <PrintButton />
        <Link href={`/lessons/${lesson.id}`} className="text-accent underline">
          Back to the editable grid
        </Link>
        <span className="text-muted">
          Printing {grids.length} page{grids.length === 1 ? '' : 's'} — one per level. Choose
          landscape in the print dialog.
        </span>
      </div>

      {grids.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing to print yet. Generate a grid on the{' '}
          <Link href={`/lessons/${lesson.id}`} className="text-accent underline">
            lesson page
          </Link>{' '}
          first.
        </p>
      ) : null}

      {grids.map((grid) => {
        const cells = new Map(grid.cells.map((cell) => [`${cell.rowKey}/${cell.columnKey}`, cell]))

        return (
          <section key={grid.id} className="print-page mb-10">
            <header className="mb-2 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-base font-semibold">
                  {lesson.number ? `Lesson ${lesson.number}: ` : ''}
                  {lesson.title}
                </h1>
                <p className="text-xs text-muted">
                  {[
                    lesson.module.curriculum.title,
                    lesson.module.number
                      ? `Module ${lesson.module.number}`
                      : lesson.module.title,
                    lesson.weekLabel,
                    lesson.module.curriculum.gradeBand,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {lesson.module.focusingQuestion ? (
                  <p className="mt-0.5 text-xs italic text-muted">
                    Focusing Question: {lesson.module.focusingQuestion}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{grid.level.name}</p>
                <p className="text-[10px] text-muted">{template.name}</p>
              </div>
            </header>

            <table className="w-full border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="w-20 border border-border bg-surface-muted p-1 text-left">
                    Phase
                  </th>
                  {shape.columns.map((column) => (
                    <th
                      key={column.key}
                      className="border border-border bg-surface-muted p-1 text-left"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shape.rows.map((row) => (
                  <tr key={row.key}>
                    <th className="border border-border bg-surface-muted p-1 text-left align-top font-semibold">
                      {row.label}
                    </th>
                    {shape.columns.map((column) => (
                      <td
                        key={column.key}
                        className="whitespace-pre-wrap border border-border p-1 align-top leading-snug"
                      >
                        {cells.get(`${row.key}/${column.key}`)?.content ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}

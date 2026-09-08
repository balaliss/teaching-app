import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { Card, EmptyState, PageHeading } from '@/components/ui'
import { UploadForm } from '@/app/curricula/UploadForm'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Waiting',
  PARSING: 'Reading it now…',
  NEEDS_REVIEW: 'Needs your check',
  READY: 'Ready to use',
  FAILED: "Couldn't read it",
}

export default async function CurriculaPage() {
  const user = await requireUser()

  const curricula = await prisma.curriculum.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      gradeBand: true,
      parseStatus: true,
      sourceFileName: true,
      updatedAt: true,
      _count: { select: { modules: true } },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeading
        title="My curriculum"
        subtitle="Add your Wit &amp; Wisdom ELD Teacher Edition here — one per module. Only you can see what you upload."
      />

      <Card>
        <UploadForm />
      </Card>

      {curricula.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body="Add your Teacher Edition PDF above. We\u2019ll pull out the modules and lessons, show you what we found so you can fix anything we got wrong, and then you can start making lesson grids."
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-1">Name</th>
                <th className="py-1">Grade</th>
                <th className="py-1">Modules</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {curricula.map((curriculum) => (
                <tr key={curriculum.id} className="border-t border-neutral-200">
                  <td className="py-2">
                    <Link
                      href={`/curricula/${curriculum.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {curriculum.title}
                    </Link>
                    <div className="text-xs text-neutral-500">{curriculum.sourceFileName}</div>
                  </td>
                  <td className="py-2">{curriculum.gradeBand ?? '—'}</td>
                  <td className="py-2">{curriculum._count.modules}</td>
                  <td className="py-2">{STATUS_LABEL[curriculum.parseStatus]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

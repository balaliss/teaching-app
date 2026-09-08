import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { Alert, Card, EmptyState, PageHeading } from '@/components/ui'
import { UploadForm } from '@/app/curricula/UploadForm'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Queued',
  PARSING: 'Reading the document…',
  NEEDS_REVIEW: 'Check the parsed structure',
  READY: 'Ready',
  FAILED: 'Could not be read',
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
        title="Curricula"
        subtitle="Upload a Wit & Wisdom ELD Teacher Edition once per module. Files stay private to your account."
      />

      <Alert kind="info">
        <p className="font-medium">How this works</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>Upload a Teacher Edition below (PDF, DOCX or XLSX).</li>
          <li>Check the modules, lessons and phases it found, and fix anything wrong.</li>
          <li>Open a lesson and hit Generate — Claude fills in the teaching grid.</li>
          <li>Edit any cell you don&apos;t like, then print.</li>
        </ol>
      </Alert>

      <Card>
        <UploadForm />
      </Card>

      {curricula.length === 0 ? (
        <EmptyState
          title="No curricula yet"
          body="Upload a Teacher Edition PDF above. The app pulls out the modules, lessons and lesson phases, then you confirm the structure before generating grids."
        />
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1">Title</th>
                <th className="py-1">Grade band</th>
                <th className="py-1">Modules</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {curricula.map((curriculum) => (
                <tr key={curriculum.id} className="border-t border-border">
                  <td className="py-2">
                    <Link
                      href={`/curricula/${curriculum.id}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {curriculum.title}
                    </Link>
                    <div className="text-xs text-muted">{curriculum.sourceFileName}</div>
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

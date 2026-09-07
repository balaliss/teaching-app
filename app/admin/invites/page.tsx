import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/session'
import { Card, PageHeading } from '@/components/ui'
import { InviteForm } from '@/app/admin/invites/InviteForm'

export default async function InvitesPage() {
  await requireAdmin()

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { usedByUser: { select: { email: true } } },
  })

  return (
    <div className="space-y-6">
      <PageHeading
        title="Invites"
        subtitle="Accounts are invite-only. Issue a code, then send the teacher the link."
      />

      <Card>
        <InviteForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Recent invites</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-neutral-600">No invites issued yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="py-1">Code</th>
                <th className="py-1">For</th>
                <th className="py-1">Role</th>
                <th className="py-1">Expires</th>
                <th className="py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => (
                <tr key={invite.id} className="border-t border-neutral-200">
                  <td className="py-1 font-mono text-xs">{invite.code}</td>
                  <td className="py-1">{invite.email ?? <span className="text-neutral-400">anyone</span>}</td>
                  <td className="py-1">{invite.role}</td>
                  <td className="py-1">{invite.expiresAt.toISOString().slice(0, 10)}</td>
                  <td className="py-1">
                    {invite.usedAt
                      ? `used by ${invite.usedByUser?.email ?? 'deleted user'}`
                      : invite.expiresAt < new Date()
                        ? 'expired'
                        : 'open'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

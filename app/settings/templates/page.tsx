import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { resolveTemplate } from '@/lib/grids'
import { readTemplateShape } from '@/lib/gridTemplate'
import { Alert, PageHeading } from '@/components/ui'
import { TemplateEditor } from '@/app/settings/templates/TemplateEditor'

export default async function TemplatesPage() {
  const user = await requireUser()

  const template = await resolveTemplate(user.id)
  const own = await prisma.gridTemplate.findFirst({ where: { ownerId: user.id } })
  const shape = readTemplateShape(template)

  return (
    <div className="space-y-6">
      <PageHeading
        title="Grid layout"
        subtitle="The rows and columns of your instruction grid. Change them here and the next grid you generate uses the new shape — no code change needed."
      />

      <Alert kind="info">
        Rows are usually the lesson phases; columns are what you want spelled out for each phase.
        The <strong>hint</strong> on each row and column is passed to Claude, so it is the most
        direct way to control what lands in a cell.
      </Alert>

      <TemplateEditor
        templateName={template.name}
        usingShared={own === null}
        initialShape={shape}
      />
    </div>
  )
}

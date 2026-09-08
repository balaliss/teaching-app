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
        title="My grid"
        subtitle="This is what your printed grid looks like: the rows down the side, the columns across the top. Change anything here and the next grid you make uses the new shape."
      />

      <Alert kind="info">
        Rows are the parts of the lesson. Columns are what you want spelled out for each part.
        <br />
        The <strong>hint</strong> box on each one is what Claude reads to decide what goes in that
        square — so if a column keeps coming out wrong, change its hint.
      </Alert>

      <TemplateEditor
        templateName={template.name}
        usingShared={own === null}
        initialShape={shape}
      />
    </div>
  )
}

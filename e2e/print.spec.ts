import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { DEFAULT_COLUMNS, DEFAULT_ROWS } from '../lib/gridTemplate'

/**
 * Verifies the printable deliverable without spending API credit: a READY grid
 * is written straight to the database, then the print route is asserted to
 * render one page per level with the cell content in the right place.
 */
const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.org'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'local-dev-password'

test.afterAll(async () => {
  await prisma.$disconnect()
})

test('the print view renders one page per level from stored cells', async ({ page }) => {
  const owner = await prisma.user.findFirstOrThrow({ where: { email: ADMIN_EMAIL } })

  const curriculum = await prisma.curriculum.create({
    data: {
      title: 'Print Fixture — Grade 3 ELD',
      gradeBand: 'Grade 3',
      sourceFileKey: 'fixture/print.pdf',
      sourceFileName: 'print.pdf',
      sourceMimeType: 'application/pdf',
      ownerId: owner.id,
      parseStatus: 'READY',
      levels: {
        create: [
          { name: 'Emerging', order: 0 },
          { name: 'Bridging', order: 1 },
        ],
      },
      modules: {
        create: {
          number: 1,
          title: 'A Great Heart',
          focusingQuestion: 'Why is the heart called a pump?',
          order: 0,
          lessons: {
            create: { number: 1, title: 'The heart as a pump', weekLabel: 'Week 1', order: 0 },
          },
        },
      },
    },
    include: { levels: true, modules: { include: { lessons: true } } },
  })

  const template = await prisma.gridTemplate.create({
    data: {
      name: 'Print Fixture Layout',
      ownerId: null,
      rows: DEFAULT_ROWS,
      columns: DEFAULT_COLUMNS,
    },
  })

  const lesson = curriculum.modules[0].lessons[0]

  try {
    for (const level of curriculum.levels) {
      await prisma.generatedGrid.create({
        data: {
          lessonId: lesson.id,
          templateId: template.id,
          levelId: level.id,
          status: 'READY',
          model: 'fixture',
          generatedAt: new Date(),
          cells: {
            create: DEFAULT_ROWS.flatMap((row) =>
              DEFAULT_COLUMNS.map((column) => ({
                rowKey: row.key,
                columnKey: column.key,
                content: `${level.name} ${row.key} ${column.key}`,
              })),
            ),
          },
        },
      })
    }

    // The print route uses the teacher's resolved template, so point them at the
    // fixture layout for the duration of the test.
    const previousOwn = await prisma.gridTemplate.findFirst({ where: { ownerId: owner.id } })
    if (previousOwn) {
      await prisma.gridTemplate.update({ where: { id: previousOwn.id }, data: { ownerId: null } })
    }
    await prisma.gridTemplate.update({ where: { id: template.id }, data: { ownerId: owner.id } })

    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('link', { name: 'Curricula', exact: true })).toBeVisible()

    await page.goto(`/lessons/${lesson.id}/print`)

    await expect(page.getByText('Printing 2 pages')).toBeVisible()
    await expect(page.locator('section.print-page')).toHaveCount(2)
    await expect(
      page.getByText('Focusing Question: Why is the heart called a pump?').first(),
    ).toBeVisible()

    // Cell content must land under the right row and column on each page.
    for (const [index, levelName] of ['Emerging', 'Bridging'].entries()) {
      const section = page.locator('section.print-page').nth(index)
      await expect(section.getByText(levelName, { exact: true })).toBeVisible()
      const learnRow = section.locator('tbody tr').filter({ hasText: 'Learn' }).first()
      await expect(learnRow.locator('td').nth(1)).toHaveText(
        `${levelName} learn teacher_does`,
      )
    }

    // Filtering to a single level prints just that page.
    await page.goto(`/lessons/${lesson.id}/print?level=${curriculum.levels[1].id}`)
    await expect(page.locator('section.print-page')).toHaveCount(1)
    await expect(page.getByText('Bridging', { exact: true })).toBeVisible()

    if (previousOwn) {
      await prisma.gridTemplate.update({
        where: { id: previousOwn.id },
        data: { ownerId: owner.id },
      })
    }
  } finally {
    await prisma.curriculum.delete({ where: { id: curriculum.id } })
    await prisma.gridTemplate.delete({ where: { id: template.id } })
  }
})

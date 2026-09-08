import { expect, test, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { makeTextPdf, SAMPLE_TEACHER_EDITION } from '../tests/fixtures/makePdf'

/**
 * End-to-end pass over the teacher's actual path: sign in, invite a colleague,
 * upload a Teacher Edition, confirm the parsed structure, change the grid
 * layout, and reach the print view. Generation itself is only asserted when
 * ANTHROPIC_API_KEY is set, so the suite stays runnable without spending money.
 */

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.org'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'local-dev-password'
const TEACHER_PASSWORD = 'second-teacher-password'

function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('link', { name: 'Curricula', exact: true })).toBeVisible()
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
}

test('unauthenticated visitors are sent to the login page', async ({ page }) => {
  await page.goto('/curricula')
  await expect(page).toHaveURL(/\/login/)
})

test('teacher path: upload, confirm structure, change layout, print', async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)

  const title = unique('E2E Module')

  await page.goto('/curricula')
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Grade band').fill('Grade 3')
  await page
    .getByLabel('File')
    .setInputFiles({
      name: 'teacher-edition.pdf',
      mimeType: 'application/pdf',
      buffer: makeTextPdf(SAMPLE_TEACHER_EDITION),
    })
  await page.getByRole('button', { name: 'Upload and parse' }).click()

  // The parser should land us on the review page with the structure it found.
  await expect(page).toHaveURL(/\/curricula\/[^/]+\/review$/)
  await expect(page.getByLabel('Module title')).toHaveValue('A Great Heart')
  await expect(page.getByText(/2 lesson\(s\)/)).toBeVisible()

  const curriculumId = page.url().split('/curricula/')[1].split('/')[0]

  // A correction the teacher makes must survive the save.
  const lesson = page.getByRole('group').first()
  await lesson.click()
  await lesson.getByLabel('Lesson title').fill('Lesson 1 — the heart as a pump')
  await page.getByRole('button', { name: 'Save structure' }).click()
  await expect(page.getByText('Structure saved')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Lesson title').first()).toHaveValue(
    'Lesson 1 — the heart as a pump',
  )

  // Changing the layout must show up on the lesson page.
  await page.goto('/settings/templates')
  const newColumnLabel = unique('Misconception')
  const columnsCard = page.getByTestId('axis-columns')
  await columnsCard.getByRole('button', { name: 'Add column' }).click()
  await columnsCard.getByLabel('Label').last().fill(newColumnLabel)
  await page.getByRole('button', { name: 'Save layout' }).click()
  await expect(page.getByText('Layout saved')).toBeVisible()

  await page.goto(`/curricula/${curriculumId}`)
  await page.getByRole('link', { name: /the heart as a pump/ }).click()
  await expect(page.getByRole('button', { name: /^Generate/ }).first()).toBeVisible()
  await expect(page.getByRole('columnheader', { name: newColumnLabel })).toBeVisible()

  // Levels are tabs; the seeded CA ELD bands should all be offered.
  const tabs = page.getByTestId('level-tabs')
  for (const level of ['Emerging', 'Expanding', 'Bridging']) {
    await expect(tabs.getByRole('button', { name: new RegExp(level) })).toBeVisible()
  }

  if (process.env.ANTHROPIC_API_KEY) {
    await page.getByRole('button', { name: /^Generate Emerging/ }).click()
    await expect(page.getByText(/^Generated /)).toBeVisible({ timeout: 180_000 })

    // A teacher edit must be marked and must survive a regeneration.
    const firstCell = page.locator('tbody tr').first().locator('td').first()
    await firstCell.hover()
    await firstCell.getByRole('button', { name: 'Edit' }).click()
    await page.locator('textarea').first().fill('Teacher-authored: greet at the door.')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Teacher-authored: greet at the door.')).toBeVisible()

    await page.getByRole('button', { name: /^Regenerate/ }).click()
    await expect(page.getByText(/^Generated /)).toBeVisible({ timeout: 180_000 })
    await expect(page.getByText('Teacher-authored: greet at the door.')).toBeVisible()
  }

  const lessonUrl = page.url()
  await page.goto(`${lessonUrl}/print`)
  await expect(page.getByRole('button', { name: 'Print / save as PDF' })).toBeVisible()

  await signOut(page)
})

test('a second teacher cannot see the first teacher\'s curricula', async ({ page }) => {
  await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)

  // Upload a curriculum of our own rather than reusing one another test made:
  // tests run in parallel and against a fresh database in CI, so depending on
  // another test's data is a race.
  await page.goto('/curricula')
  await page.getByLabel('Title').fill(unique('Isolation Fixture'))
  await page.getByLabel('File').setInputFiles({
    name: 'teacher-edition.pdf',
    mimeType: 'application/pdf',
    buffer: makeTextPdf(SAMPLE_TEACHER_EDITION),
  })
  await page.getByRole('button', { name: 'Upload and parse' }).click()
  await expect(page).toHaveURL(/\/curricula\/[^/]+\/review$/)
  const href = `/curricula/${page.url().split('/curricula/')[1].split('/')[0]}`

  // Issue an invite and redeem it as a new teacher.
  await page.goto('/admin/invites')
  const teacherEmail = `${unique('teacher')}@example.org`
  await page.getByLabel('Email').fill(teacherEmail)
  await page.getByRole('button', { name: 'Create invite' }).click()
  const link = await page.locator('code').first().innerText()
  const code = new URL(link).searchParams.get('code')
  expect(code).toBeTruthy()

  await signOut(page)

  await page.goto(`/register?code=${code}`)
  await page.getByLabel('Name').fill('Second Teacher')
  await page.getByLabel('Email').fill(teacherEmail)
  await page.getByLabel('Password').fill(TEACHER_PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('link', { name: 'Curricula', exact: true })).toBeVisible()

  // The admin's curriculum must be invisible, and admin pages out of reach.
  await page.goto(href)
  await expect(page.getByRole('heading', { name: /could not be found/i })).toBeVisible()

  await page.goto('/admin/usage')
  await expect(page).toHaveURL(/\/$/)
})

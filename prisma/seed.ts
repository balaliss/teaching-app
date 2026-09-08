/**
 * Seeds the shared default grid template and one ADMIN account, so a fresh
 * install has something to log into and a grid shape to start from.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  DEFAULT_TEMPLATE_NAME,
} from '../lib/gridTemplate'

const prisma = new PrismaClient()

async function main() {
  // The default template has no owner: it is visible to every teacher and is the
  // starting point they copy or edit.
  const existingDefault = await prisma.gridTemplate.findFirst({
    where: { isDefault: true, ownerId: null },
  })

  if (existingDefault) {
    await prisma.gridTemplate.update({
      where: { id: existingDefault.id },
      data: { name: DEFAULT_TEMPLATE_NAME, rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS },
    })
    console.log(`Updated default grid template ${existingDefault.id}`)
  } else {
    const created = await prisma.gridTemplate.create({
      data: {
        name: DEFAULT_TEMPLATE_NAME,
        isDefault: true,
        rows: DEFAULT_ROWS,
        columns: DEFAULT_COLUMNS,
      },
    })
    console.log(`Created default grid template ${created.id}`)
  }

  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed.')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN' },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? 'Admin',
      passwordHash,
      role: 'ADMIN',
      monthlyTokenCap: null,
    },
  })
  console.log(`Admin account ready: ${admin.email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

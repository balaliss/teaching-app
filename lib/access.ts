/**
 * Ownership checks. Curricula are private to the teacher who uploaded them, so
 * every read and write funnels through one of these helpers. A record owned by
 * someone else is reported as not found rather than forbidden, so a direct URL
 * leaks nothing.
 */
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'

export async function ownedCurriculum(curriculumId: string, userId: string) {
  const curriculum = await prisma.curriculum.findFirst({
    where: { id: curriculumId, ownerId: userId },
  })
  if (!curriculum) notFound()
  return curriculum
}

export async function ownedLesson(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { curriculum: { ownerId: userId } } },
    include: {
      module: { include: { curriculum: { include: { levels: { orderBy: { order: 'asc' } } } } } },
      sections: { orderBy: { order: 'asc' } },
    },
  })
  if (!lesson) notFound()
  return lesson
}

/** Throwing variant for server actions, where notFound() would be misleading. */
export async function assertLessonOwner(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, module: { curriculum: { ownerId: userId } } },
    select: { id: true },
  })
  if (!lesson) throw new Error('Lesson not found.')
  return lesson
}

export async function assertCurriculumOwner(curriculumId: string, userId: string) {
  const curriculum = await prisma.curriculum.findFirst({
    where: { id: curriculumId, ownerId: userId },
    select: { id: true },
  })
  if (!curriculum) throw new Error('Curriculum not found.')
  return curriculum
}

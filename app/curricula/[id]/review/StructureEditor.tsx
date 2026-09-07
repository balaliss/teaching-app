'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, inputClass } from '@/components/ui'
import { reparseAction, saveStructureAction, type StructureInput } from './actions'

type Module = StructureInput['modules'][number]
type Lesson = Module['lessons'][number]
type Section = Lesson['sections'][number]

const PHASES: Section['phase'][] = ['WELCOME', 'LAUNCH', 'LEARN', 'LAND', 'WRAP', 'OTHER']

const emptySection = (): Section => ({
  id: null,
  phase: 'LEARN',
  heading: 'New phase',
  rawText: '',
  deleted: false,
})

const emptyLesson = (): Lesson => ({
  id: null,
  number: null,
  title: 'New lesson',
  weekLabel: null,
  deleted: false,
  sections: [emptySection()],
})

const emptyModule = (): Module => ({
  id: null,
  number: null,
  title: 'New module',
  focusingQuestion: null,
  deleted: false,
  lessons: [emptyLesson()],
})

export function StructureEditor({
  curriculumId,
  parseStatus,
  parseError,
  initialModules,
}: {
  curriculumId: string
  parseStatus: string
  parseError: string | null
  initialModules: Module[]
}) {
  const router = useRouter()
  const [modules, setModules] = useState<Module[]>(initialModules)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [pending, setPending] = useState<'save' | 'reparse' | null>(null)

  const patchModule = (index: number, patch: Partial<Module>) =>
    setModules((current) =>
      current.map((module, i) => (i === index ? { ...module, ...patch } : module)),
    )

  const patchLesson = (mi: number, li: number, patch: Partial<Lesson>) =>
    setModules((current) =>
      current.map((module, i) =>
        i === mi
          ? {
              ...module,
              lessons: module.lessons.map((lesson, j) =>
                j === li ? { ...lesson, ...patch } : lesson,
              ),
            }
          : module,
      ),
    )

  const patchSection = (mi: number, li: number, si: number, patch: Partial<Section>) =>
    setModules((current) =>
      current.map((module, i) =>
        i === mi
          ? {
              ...module,
              lessons: module.lessons.map((lesson, j) =>
                j === li
                  ? {
                      ...lesson,
                      sections: lesson.sections.map((section, k) =>
                        k === si ? { ...section, ...patch } : section,
                      ),
                    }
                  : lesson,
              ),
            }
          : module,
      ),
    )

  async function onSave() {
    setPending('save')
    setMessage(null)
    const result = await saveStructureAction({ curriculumId, modules })
    setPending(null)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    setMessage({ kind: 'success', text: 'Structure saved. You can generate grids now.' })
    setModules((current) =>
      current
        .filter((module) => !module.deleted)
        .map((module) => ({
          ...module,
          lessons: module.lessons
            .filter((lesson) => !lesson.deleted)
            .map((lesson) => ({
              ...lesson,
              sections: lesson.sections.filter((section) => !section.deleted),
            })),
        })),
    )
    router.refresh()
  }

  async function onReparse() {
    if (
      !window.confirm(
        'Re-parsing replaces the structure below with a fresh read of the uploaded file. Any corrections you made here will be lost. Continue?',
      )
    ) {
      return
    }
    setPending('reparse')
    setMessage(null)
    const result = await reparseAction(curriculumId)
    setPending(null)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    router.refresh()
  }

  const visibleModules = modules.filter((module) => !module.deleted)

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button onClick={onSave} disabled={pending !== null}>
          {pending === 'save' ? 'Saving…' : 'Save structure'}
        </Button>
        <Button variant="secondary" onClick={onReparse} disabled={pending !== null}>
          {pending === 'reparse' ? 'Re-parsing…' : 'Re-parse the file'}
        </Button>
        <Button variant="secondary" onClick={() => setModules((c) => [...c, emptyModule()])}>
          Add module
        </Button>
        <span className="text-xs text-muted">
          {visibleModules.length} module(s) ·{' '}
          {visibleModules.reduce(
            (sum, m) => sum + m.lessons.filter((l) => !l.deleted).length,
            0,
          )}{' '}
          lesson(s) · status {parseStatus}
        </span>
      </div>

      {message ? <Alert kind={message.kind}>{message.text}</Alert> : null}
      {parseError ? <Alert>{parseError}</Alert> : null}

      {visibleModules.length === 0 ? (
        <Alert kind="info">
          Nothing here yet. Use “Add module” to build the structure by hand, or re-parse the file.
        </Alert>
      ) : null}

      {modules.map((module, mi) =>
        module.deleted ? null : (
          <Card key={module.id ?? `m-${mi}`}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="font-medium">Module #</span>
                <input
                  type="number"
                  value={module.number ?? ''}
                  onChange={(e) =>
                    patchModule(mi, {
                      number: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className={`${inputClass} mt-1 w-20`}
                />
              </label>
              <label className="min-w-64 flex-1 text-sm">
                <span className="font-medium">Module title</span>
                <input
                  value={module.title}
                  onChange={(e) => patchModule(mi, { title: e.target.value })}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="min-w-64 flex-1 text-sm">
                <span className="font-medium">Focusing question</span>
                <input
                  value={module.focusingQuestion ?? ''}
                  onChange={(e) =>
                    patchModule(mi, { focusingQuestion: e.target.value || null })
                  }
                  className={`${inputClass} mt-1`}
                />
              </label>
              <Button variant="danger" onClick={() => patchModule(mi, { deleted: true })}>
                Remove module
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {module.lessons.map((lesson, li) =>
                lesson.deleted ? null : (
                  <details
                    key={lesson.id ?? `l-${mi}-${li}`}
                    className="rounded border border-border bg-surface-muted p-3"
                  >
                    <summary className="cursor-pointer text-sm font-medium">
                      {lesson.weekLabel ? `${lesson.weekLabel} · ` : ''}
                      {lesson.number ? `Lesson ${lesson.number}: ` : ''}
                      {lesson.title}
                      <span className="ml-2 text-xs font-normal text-muted">
                        {lesson.sections.filter((s) => !s.deleted).length} phase(s)
                      </span>
                    </summary>

                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="text-sm">
                        <span className="font-medium">Lesson #</span>
                        <input
                          type="number"
                          value={lesson.number ?? ''}
                          onChange={(e) =>
                            patchLesson(mi, li, {
                              number: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className={`${inputClass} mt-1 w-20`}
                        />
                      </label>
                      <label className="min-w-64 flex-1 text-sm">
                        <span className="font-medium">Lesson title</span>
                        <input
                          value={lesson.title}
                          onChange={(e) => patchLesson(mi, li, { title: e.target.value })}
                          className={`${inputClass} mt-1`}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="font-medium">Week</span>
                        <input
                          value={lesson.weekLabel ?? ''}
                          placeholder="Week 3"
                          onChange={(e) =>
                            patchLesson(mi, li, { weekLabel: e.target.value || null })
                          }
                          className={`${inputClass} mt-1 w-28`}
                        />
                      </label>
                      <Button
                        variant="danger"
                        onClick={() => patchLesson(mi, li, { deleted: true })}
                      >
                        Remove lesson
                      </Button>
                    </div>

                    <div className="mt-3 space-y-3">
                      {lesson.sections.map((section, si) =>
                        section.deleted ? null : (
                          <div
                            key={section.id ?? `s-${mi}-${li}-${si}`}
                            className="rounded border border-border bg-surface p-3"
                          >
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="text-sm">
                                <span className="font-medium">Phase</span>
                                <select
                                  value={section.phase}
                                  onChange={(e) =>
                                    patchSection(mi, li, si, {
                                      phase: e.target.value as Section['phase'],
                                    })
                                  }
                                  className={`${inputClass} mt-1 w-32`}
                                >
                                  {PHASES.map((phase) => (
                                    <option key={phase} value={phase}>
                                      {phase}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="min-w-64 flex-1 text-sm">
                                <span className="font-medium">Heading</span>
                                <input
                                  value={section.heading}
                                  onChange={(e) =>
                                    patchSection(mi, li, si, { heading: e.target.value })
                                  }
                                  className={`${inputClass} mt-1`}
                                />
                              </label>
                              <Button
                                variant="danger"
                                onClick={() => patchSection(mi, li, si, { deleted: true })}
                              >
                                Remove
                              </Button>
                            </div>
                            <label className="mt-2 block text-sm">
                              <span className="font-medium">Teacher Edition text</span>
                              <textarea
                                value={section.rawText}
                                rows={4}
                                onChange={(e) =>
                                  patchSection(mi, li, si, { rawText: e.target.value })
                                }
                                className={`${inputClass} mt-1 font-mono text-xs`}
                              />
                            </label>
                          </div>
                        ),
                      )}
                      <Button
                        variant="secondary"
                        onClick={() =>
                          patchLesson(mi, li, {
                            sections: [...lesson.sections, emptySection()],
                          })
                        }
                      >
                        Add phase
                      </Button>
                    </div>
                  </details>
                ),
              )}
              <Button
                variant="secondary"
                onClick={() => patchModule(mi, { lessons: [...module.lessons, emptyLesson()] })}
              >
                Add lesson
              </Button>
            </div>
          </Card>
        ),
      )}
    </div>
  )
}

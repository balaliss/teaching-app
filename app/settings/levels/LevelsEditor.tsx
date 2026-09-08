'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, inputClass } from '@/components/ui'
import { DEFAULT_LEVELS } from '@/lib/gridTemplate'
import { saveLevelsAction } from './actions'

interface LevelRow {
  id: string | null
  name: string
  description: string | null
  deleted: boolean
}

const WIDA_PRESET = [
  'Entering',
  'Emerging',
  'Developing',
  'Expanding',
  'Bridging',
  'Reaching',
]

export function LevelsEditor({
  curriculumId,
  initialLevels,
}: {
  curriculumId: string
  initialLevels: LevelRow[]
}) {
  const router = useRouter()
  const [levels, setLevels] = useState<LevelRow[]>(initialLevels)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [pending, setPending] = useState(false)

  const patch = (index: number, next: Partial<LevelRow>) =>
    setLevels((current) => current.map((level, i) => (i === index ? { ...level, ...next } : level)))

  async function onSave() {
    setPending(true)
    setMessage(null)
    const result = await saveLevelsAction({ curriculumId, levels })
    setPending(false)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    setLevels((current) => current.filter((level) => !level.deleted))
    setMessage({ kind: 'success', text: 'Levels saved.' })
    router.refresh()
  }

  function applyCaPreset() {
    setLevels((current) => [
      ...current.map((level) => ({ ...level, deleted: true })),
      ...DEFAULT_LEVELS.map((level) => ({
        id: null,
        name: level.name,
        description: level.description,
        deleted: false,
      })),
    ])
  }

  function applyWidaPreset() {
    setLevels((current) => [
      ...current.map((level) => ({ ...level, deleted: true })),
      ...WIDA_PRESET.map((name, index) => ({
        id: null,
        name: `${index + 1} — ${name}`,
        description: null,
        deleted: false,
      })),
    ])
  }

  const visible = levels.filter((level) => !level.deleted)

  return (
    <div className="space-y-4">
      {message ? <Alert kind={message.kind}>{message.text}</Alert> : null}

      {levels.map((level, index) =>
        level.deleted ? null : (
          <Card key={level.id ?? `new-${index}`}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-56 flex-1 text-sm">
                <span className="font-medium">What you call this level</span>
                <input
                  value={level.name}
                  onChange={(event) => patch(index, { name: event.target.value })}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <Button
                variant="danger"
                onClick={() => patch(index, { deleted: true })}
                disabled={visible.length <= 1}
              >
                Remove
              </Button>
            </div>
            <label className="mt-2 block text-sm">
              <span className="font-medium">What these students can and can&apos;t do yet</span>
              <textarea
                value={level.description ?? ''}
                rows={3}
                onChange={(event) => patch(index, { description: event.target.value || null })}
                className={`${inputClass} mt-1 text-xs`}
                placeholder="e.g. Can follow a read-aloud and answer in short phrases. Still needs sentence frames supplied and key words pre-taught."
              />
            </label>
            {level.id ? null : (
              <p className="mt-1 text-xs text-neutral-500">New — no grids yet.</p>
            )}
          </Card>
        ),
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onSave} disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            setLevels((current) => [
              ...current,
              { id: null, name: '', description: null, deleted: false },
            ])
          }
        >
          Add another level
        </Button>
        <Button variant="secondary" onClick={applyCaPreset}>
          Use the 3 California levels
        </Button>
        <Button variant="secondary" onClick={applyWidaPreset}>
          Use the 6 WIDA levels
        </Button>
      </div>
      <p className="text-xs text-neutral-500">
        Delete a level and its grids go too. The buttons above fill in a ready-made set. Nothing
        changes until you press Save.
      </p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Card, inputClass } from '@/components/ui'
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  toKey,
  type GridAxisItem,
  type GridTemplateShape,
} from '@/lib/gridTemplate'
import { resetTemplateAction, saveTemplateAction } from './actions'

type Axis = 'rows' | 'columns'

/** Suffixes a derived key until it no longer collides with an existing one. */
function uniqueKey(base: string, taken: string[]): string {
  if (!taken.includes(base)) return base
  let suffix = 2
  while (taken.includes(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

export function TemplateEditor({
  templateName,
  usingShared,
  initialShape,
}: {
  templateName: string
  usingShared: boolean
  initialShape: GridTemplateShape
}) {
  const router = useRouter()
  const [name, setName] = useState(templateName)
  const [shape, setShape] = useState<GridTemplateShape>(initialShape)
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [pending, setPending] = useState(false)

  const patch = (axis: Axis, index: number, next: Partial<GridAxisItem>) =>
    setShape((current) => ({
      ...current,
      [axis]: current[axis].map((item, i) => (i === index ? { ...item, ...next } : item)),
    }))

  /**
   * Derives the storage key from the label while an entry is still new. Keys are
   * left alone once cells exist under them, and collisions are suffixed rather
   * than rejected on save.
   */
  const patchLabel = (axis: Axis, index: number, label: string) =>
    setShape((current) => {
      const items = current[axis]
      const item = items[index]
      const isNew = item.key.startsWith('field_') || item.label.trim() === ''
      const derived = isNew
        ? uniqueKey(
            toKey(label) || item.key,
            items.filter((_, i) => i !== index).map((other) => other.key),
          )
        : item.key

      return {
        ...current,
        [axis]: items.map((existing, i) =>
          i === index ? { ...existing, label, key: derived } : existing,
        ),
      }
    })

  const remove = (axis: Axis, index: number) =>
    setShape((current) => ({
      ...current,
      [axis]: current[axis].filter((_, i) => i !== index),
    }))

  const move = (axis: Axis, index: number, delta: number) =>
    setShape((current) => {
      const next = [...current[axis]]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, [axis]: next }
    })

  const add = (axis: Axis) =>
    setShape((current) => ({
      ...current,
      [axis]: [
        ...current[axis],
        { key: `field_${current[axis].length + 1}`, label: '', hint: '' },
      ],
    }))

  async function onSave() {
    setPending(true)
    setMessage(null)
    // Blank hints are dropped so they do not become empty guidance in the prompt.
    const cleaned: GridTemplateShape = {
      rows: shape.rows.map((item) => ({ ...item, hint: item.hint?.trim() || undefined })),
      columns: shape.columns.map((item) => ({ ...item, hint: item.hint?.trim() || undefined })),
    }
    const result = await saveTemplateAction({ name, shape: cleaned })
    setPending(false)
    if (!result.ok) {
      setMessage({ kind: 'error', text: result.error })
      return
    }
    setMessage({
      kind: 'success',
      text: 'Layout saved. Existing grids keep the cells they have; regenerate a lesson to fill any new rows or columns.',
    })
    router.refresh()
  }

  async function onReset() {
    if (!window.confirm('Discard your layout and go back to the shared default?')) return
    setPending(true)
    await resetTemplateAction()
    setShape({ rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS })
    setPending(false)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {message ? <Alert kind={message.kind}>{message.text}</Alert> : null}

      <Card>
        <label className="block text-sm">
          <span className="font-medium">Layout name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={`${inputClass} mt-1 max-w-md`}
          />
        </label>
        {usingShared ? (
          <p className="mt-2 text-xs text-neutral-500">
            You are currently using the shared default. Saving creates your own copy.
          </p>
        ) : null}
      </Card>

      <AxisEditor
        testId="axis-rows"
        title="Rows"
        description="One row per lesson phase."
        items={shape.rows}
        onLabel={(index, label) => patchLabel('rows', index, label)}
        onPatch={(index, next) => patch('rows', index, next)}
        onRemove={(index) => remove('rows', index)}
        onMove={(index, delta) => move('rows', index, delta)}
        onAdd={() => add('rows')}
      />

      <AxisEditor
        testId="axis-columns"
        title="Columns"
        description="One column per thing you want spelled out for every phase."
        items={shape.columns}
        onLabel={(index, label) => patchLabel('columns', index, label)}
        onPatch={(index, next) => patch('columns', index, next)}
        onRemove={(index) => remove('columns', index)}
        onMove={(index, delta) => move('columns', index, delta)}
        onAdd={() => add('columns')}
      />

      <div className="flex flex-wrap gap-3">
        <Button onClick={onSave} disabled={pending}>
          {pending ? 'Saving…' : 'Save layout'}
        </Button>
        {usingShared ? null : (
          <Button variant="secondary" onClick={onReset} disabled={pending}>
            Reset to shared default
          </Button>
        )}
      </div>
    </div>
  )
}

function AxisEditor({
  testId,
  title,
  description,
  items,
  onLabel,
  onPatch,
  onRemove,
  onMove,
  onAdd,
}: {
  testId: string
  title: string
  description: string
  items: GridAxisItem[]
  onLabel: (index: number, label: string) => void
  onPatch: (index: number, next: Partial<GridAxisItem>) => void
  onRemove: (index: number) => void
  onMove: (index: number, delta: number) => void
  onAdd: () => void
}) {
  return (
    <Card testId={testId}>
      <h2 className="font-medium">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500">{description}</p>

      <div className="mt-3 space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded border border-neutral-300 p-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="min-w-48 flex-1 text-sm">
                <span className="font-medium">Label</span>
                <input
                  value={item.label}
                  onChange={(event) => onLabel(index, event.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">Key</span>
                <input
                  value={item.key}
                  onChange={(event) => onPatch(index, { key: event.target.value })}
                  className={`${inputClass} mt-1 w-40 font-mono text-xs`}
                />
              </label>
              <div className="flex gap-1">
                <Button variant="secondary" onClick={() => onMove(index, -1)} className="!px-2">
                  ↑
                </Button>
                <Button variant="secondary" onClick={() => onMove(index, 1)} className="!px-2">
                  ↓
                </Button>
                <Button variant="danger" onClick={() => onRemove(index)}>
                  Remove
                </Button>
              </div>
            </div>
            <label className="mt-2 block text-sm">
              <span className="font-medium">Hint for Claude</span>
              <textarea
                value={item.hint ?? ''}
                rows={2}
                onChange={(event) => onPatch(index, { hint: event.target.value })}
                className={`${inputClass} mt-1 text-xs`}
                placeholder="What belongs in this cell, and how it should be written."
              />
            </label>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Button variant="secondary" onClick={onAdd}>
          Add {title.toLowerCase().replace(/s$/, '')}
        </Button>
      </div>
    </Card>
  )
}

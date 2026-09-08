import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLUMNS,
  DEFAULT_ROWS,
  gridTemplateShapeSchema,
  readTemplateShape,
  toKey,
} from '@/lib/gridTemplate'

describe('grid template shape', () => {
  it('accepts the seeded default', () => {
    expect(
      gridTemplateShapeSchema.safeParse({ rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS }).success,
    ).toBe(true)
  })

  it('rejects duplicate keys, which would collide on GridCell', () => {
    const result = gridTemplateShapeSchema.safeParse({
      rows: [
        { key: 'learn', label: 'Learn' },
        { key: 'learn', label: 'Learn again' },
      ],
      columns: DEFAULT_COLUMNS,
    })
    expect(result.success).toBe(false)
  })

  it('rejects keys that are not storage-safe', () => {
    const result = gridTemplateShapeSchema.safeParse({
      rows: [{ key: 'Teacher Does', label: 'Teacher does' }],
      columns: DEFAULT_COLUMNS,
    })
    expect(result.success).toBe(false)
  })

  it('falls back to the default when stored JSON is unusable', () => {
    const shape = readTemplateShape({ rows: 'not-an-array', columns: null })
    expect(shape.rows).toEqual(DEFAULT_ROWS)
    expect(shape.columns).toEqual(DEFAULT_COLUMNS)
  })

  it('reads a custom shape back unchanged', () => {
    const custom = {
      rows: [{ key: 'do_now', label: 'Do Now' }],
      columns: [{ key: 'minutes', label: 'Minutes' }],
    }
    expect(readTemplateShape(custom)).toEqual(custom)
  })

  it('derives keys from labels', () => {
    expect(toKey('Check for understanding')).toBe('check_for_understanding')
    expect(toKey('Teacher says & does')).toBe('teacher_says_does')
    expect(toKey('!!!')).toBe('field')
  })
})

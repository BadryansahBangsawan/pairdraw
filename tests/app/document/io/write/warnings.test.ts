import { beforeEach, describe, expect, test } from 'bun:test'

import type { WriteDocumentWarning } from '@pairdraw/core/io'

import { reportWriteWarnings } from '@/app/document/io/write/warnings'
import { toast } from '@/app/shell/ui'

beforeEach(() => {
  toast.toasts.value = []
})

function shown(): string[] {
  return toast.toasts.value.map((entry) => entry.message)
}

function pen(counts: Partial<Record<'images' | 'effects' | 'filters' | 'scroll', number>> = {}) {
  const warnings: WriteDocumentWarning[] = []
  if (counts.images) warnings.push({ kind: 'missing-image-fills', count: counts.images })
  if (counts.effects) warnings.push({ kind: 'dropped-effects', count: counts.effects })
  if (counts.filters) warnings.push({ kind: 'dropped-filters', count: counts.filters })
  if (counts.scroll) warnings.push({ kind: 'dropped-scroll', count: counts.scroll })
  return warnings
}

describe('reportWriteWarnings', () => {
  test('says nothing when a write left nothing out', () => {
    reportWriteWarnings([])

    expect(shown()).toEqual([])
  })

  test('shows what a page merge left behind', () => {
    reportWriteWarnings([{ kind: 'merged-pages', pages: 2, name: 'Plan' }])

    expect(shown()).toEqual(['Pencil.dev files hold one page; 2 pages were merged into “Plan”.'])
  })

  test('one toast for the whole write, with the surplus counted', () => {
    reportWriteWarnings([
      { kind: 'missing-image-fills', count: 1 },
      { kind: 'dropped-effects', count: 2 },
      { kind: 'dropped-filters', count: 1 },
      { kind: 'dropped-scroll', count: 3 },
      { kind: 'library-definitions', count: 2 }
    ])

    expect(shown()).toHaveLength(1)
    const [message = ''] = shown()
    expect(message).toContain('2 enabled libraries')
    expect(message).toContain('An image fill was left out')
    expect(message).toContain('2 noise and texture effects were left out')
    expect(message).not.toContain('image adjustment filter')
    expect(message).toContain('and 2 more could not be saved.')
  })

  test('the order of kinds is fixed, whatever order the writer reported', () => {
    reportWriteWarnings([
      { kind: 'dropped-scroll', count: 1 },
      { kind: 'missing-image-fills', count: 1 }
    ])

    const [message = ''] = shown()
    expect(message.indexOf('An image fill')).toBeLessThan(message.indexOf('A layer’s scroll'))
  })

  test('a count of one reads as one', () => {
    reportWriteWarnings([
      { kind: 'missing-image-fills', count: 1 },
      { kind: 'library-definitions', count: 1 }
    ])

    const [message = ''] = shown()
    expect(message).toContain('An image fill was left out')
    expect(message).toContain('one enabled library')
  })

  test('unbound variables name the layers that lose a binding', () => {
    const base = { kind: 'unbound-variables' as const, variables: 3, collections: ['Brand'] }
    reportWriteWarnings([{ ...base, layers: 0 }])
    reportWriteWarnings([{ ...base, layers: 1 }])
    reportWriteWarnings([{ ...base, layers: 2 }])

    expect(shown()).toEqual([
      'draw.io has no variables: 3 variables in 1 collection (Brand) not written.',
      'draw.io has no variables: 3 variables in 1 collection (Brand) not written, and the layer that uses them lost its binding.',
      'draw.io has no variables: 3 variables in 1 collection (Brand) not written, and 2 layers that use them lost their bindings.'
    ])
  })

  test('a single variable reads in the singular', () => {
    reportWriteWarnings([
      { kind: 'unbound-variables', variables: 1, collections: ['Brand', 'Mode'], layers: 0 }
    ])

    expect(shown()[0]).toContain('1 variable in 2 collections (Brand, Mode)')
  })

  test('a second write shows its own toast again', () => {
    reportWriteWarnings(pen({ images: 1 }))
    reportWriteWarnings(pen({ images: 1 }))

    expect(shown()).toHaveLength(1)
    expect(toast.toasts.value[0]?.count).toBe(2)
  })
})

import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { batchUpdate } from '#core/tools/structure/batch'

type BatchResult = {
  updated?: number
  results?: Array<{ id: string; updated: string[] }>
  errors?: string[]
  error?: string
}

function frame() {
  const figma = new FigmaAPI(new SceneGraph())
  const node = figma.createFrame()
  return { figma, node }
}

/** A batch that renames the frame, then changes one prop of the layer named `id`. */
function batch(frameId: string, id: string, props: Record<string, unknown>): string {
  return JSON.stringify([
    { id: frameId, props: { name: 'Renamed', opacity: 0.5 } },
    { id, props }
  ])
}

describe('batch_update operations', () => {
  test('refuses a page a layout prop and changes nothing else in the batch', () => {
    const { figma, node } = frame()
    const page = figma.graph.getPages()[0]
    const operations = [
      { id: node.id, props: { name: 'Renamed' } },
      { id: page?.id ?? '', props: { spacing: 8 } }
    ]

    const parsed = v.safeParse(batchUpdate.input, { operations })
    if (!parsed.success) throw new Error('the operations array is refused')
    const result = batchUpdate.execute(figma, parsed.output) as BatchResult

    expect(result.error).toMatch(/page cannot hold auto layout/i)
    expect(node.name).not.toBe('Renamed')
    expect(figma.graph.getNode(page?.id ?? '')?.itemSpacing).toBe(0)
  })

  test('counts operations an agent sends as an array', () => {
    const { figma, node } = frame()
    const operations = [
      { id: node.id, props: { spacing: 8 } },
      { id: node.id, props: { padding: 4 } }
    ]

    const parsed = v.safeParse(batchUpdate.input, { operations })
    if (!parsed.success) throw new Error('the operations array is refused')
    const result = batchUpdate.execute(figma, parsed.output) as BatchResult

    expect(result.updated).toBe(2)
    expect(node.itemSpacing).toBe(8)
    expect(node.paddingTop).toBe(4)
  })

  test('counts a JSON string of operations', () => {
    const { figma, node } = frame()
    const operations = JSON.stringify([{ id: node.id, props: { spacing: 8 } }])

    const result = batchUpdate.execute(figma, v.parse(batchUpdate.input, { operations }))

    expect(result).toMatchObject({ updated: 1 })
    expect(node.itemSpacing).toBe(8)
  })

  test('an array without a props object is refused', () => {
    const parsed = v.safeParse(batchUpdate.input, { operations: [{ id: '1:2' }] })
    expect(parsed.success).toBe(false)
  })

  test('a string that is not JSON is refused', () => {
    const { figma } = frame()

    const result = batchUpdate.execute(
      figma,
      v.parse(batchUpdate.input, { operations: 'not json' })
    ) as BatchResult

    expect(result.error).toStartWith('Invalid operations:')
  })

  test('applies every operation as one undo step', () => {
    const { figma, node } = frame()
    const other = figma.createRectangle()
    const operations = batch(node.id, other.id, { visible: false, corner_radius: 4 })

    const result = batchUpdate.execute(
      figma,
      v.parse(batchUpdate.input, { operations })
    ) as BatchResult

    expect(result).toEqual({
      updated: 2,
      results: [
        { id: node.id, updated: ['name', 'opacity'] },
        { id: other.id, updated: ['visible', 'corner_radius'] }
      ]
    })
    expect([node.name, node.opacity, other.cornerRadius, other.visible]).toEqual([
      'Renamed',
      0.5,
      4,
      false
    ])
  })

  test.each([
    ['a missing layer', 'missing', {}, 'Node "missing" not found'],
    ['a value of the wrong type', 'self', { spacing: 'wide' }, 'at 1.props.spacing'],
    [
      'a value outside its options',
      'self',
      { counter_align: 'middle' },
      'at 1.props.counter_align'
    ],
    ['a prop it does not take', 'self', { fill: '#f00' }, 'at 1.props.fill']
  ])('changes nothing when one operation names %s', (_, target, props, message) => {
    const { figma, node } = frame()
    const id = target === 'self' ? node.id : target
    const operations = batch(node.id, id, props)

    const result = batchUpdate.execute(
      figma,
      v.parse(batchUpdate.input, { operations })
    ) as BatchResult

    expect(result.error).toContain(message)
    expect([node.name, node.opacity]).toEqual(['Frame', 1])
  })
})

test('a SPACE_AROUND batch applies, as set_layout accepts it', () => {
  const { figma, node } = frame()
  const operations = [{ id: node.id, props: { align: 'SPACE_AROUND' } }]

  const result = batchUpdate.execute(
    figma,
    v.parse(batchUpdate.input, { operations })
  ) as BatchResult

  expect(result.error).toBeUndefined()
  expect(result.updated).toBe(1)
  expect(node.primaryAxisAlignItems).toBe('SPACE_AROUND')
})

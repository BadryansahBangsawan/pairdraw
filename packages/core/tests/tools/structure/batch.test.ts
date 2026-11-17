import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import { batchUpdate } from '#core/tools/structure/batch'

type BatchResult = { updated?: number; errors?: string[]; error?: string }

function frame() {
  const figma = new FigmaAPI(new SceneGraph())
  const node = figma.createFrame()
  return { figma, node }
}

describe('batch_update operations', () => {
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

    expect(result.error).toBe('Invalid JSON in operations')
  })

  test('an operation for a missing node reports the node, not a failed call', () => {
    const { figma, node } = frame()
    const operations = [
      { id: node.id, props: { spacing: 8 } },
      { id: '9:9', props: { spacing: 2 } }
    ]

    const result = batchUpdate.execute(
      figma,
      v.parse(batchUpdate.input, { operations })
    ) as BatchResult

    expect(result.updated).toBe(1)
    expect(result.errors).toEqual(['Node "9:9" not found'])
  })
})

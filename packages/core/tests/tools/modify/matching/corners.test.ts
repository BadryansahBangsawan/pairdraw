import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { runTool, setupToolTest } from '#core-tests/helpers/tools'

describe('replace_matching_properties on rendered corners', () => {
  test('swaps the radius JSX rounded gives a frame, and ignores its untouched corner fields', async () => {
    const { figma, graph } = setupToolTest()
    const card = await runTool(figma, 'render', {
      jsx: '<Frame name="Card" w={120} h={80} bg="#FFF" rounded={12} />'
    })
    if (typeof card !== 'object' || card === null || !('id' in card)) throw new Error('No frame')
    const id = String(card.id)
    expect(getNodeOrThrow(graph, id)).toMatchObject({ cornerRadius: 12, independentCorners: false })

    const zero = await runTool(figma, 'replace_matching_properties', {
      corner_radius: [{ from: 0, to: 4 }]
    })
    expect(zero).toMatchObject({ changed: 0 })
    expect(getNodeOrThrow(graph, id).cornerRadius).toBe(12)

    const result = await runTool(figma, 'replace_matching_properties', {
      corner_radius: [{ from: 12, to: 4 }]
    })
    expect(result).toMatchObject({ replaced: { corner_radius: 1 }, ids: [id] })
    expect(getNodeOrThrow(graph, id)).toMatchObject({
      cornerRadius: 4,
      topLeftRadius: 4,
      bottomLeftRadius: 4,
      independentCorners: false
    })
  })
})

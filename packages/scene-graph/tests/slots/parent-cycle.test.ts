import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { canCreateSlot, ownsSlotContent, slotScope } from '@pairdraw/scene-graph/slots'

import { expectDefined } from '../helpers/assert'

/** Two frames that name each other as parent, as damaged data can. */
function parentCycle() {
  const graph = new SceneGraph()
  const page = expectDefined(graph.getPages()[0])
  const a = graph.createNode('FRAME', page.id, { name: 'A' })
  const b = graph.createNode('FRAME', a.id, {
    name: 'B',
    componentPropertyReferences: [{ propertyId: 'slot', field: 'SLOT_CONTENT' }]
  })
  const child = graph.createNode('FRAME', b.id, { name: 'Child' })
  a.parentId = b.id
  return { graph, a, b, child }
}

describe('slot walks over a parent cycle', () => {
  test('slotScope finishes', () => {
    const { graph, child } = parentCycle()
    expect(slotScope(graph, child.id).kind).toBe('free')
  })

  test('canCreateSlot finishes', () => {
    const { graph, child } = parentCycle()
    expect(canCreateSlot(graph, child)).toBe(false)
  })

  test('ownsSlotContent finishes', () => {
    const { graph, b } = parentCycle()
    expect(ownsSlotContent(graph, b)).toBe(false)
  })
})

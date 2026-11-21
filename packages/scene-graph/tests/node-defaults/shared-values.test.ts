import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import type { Fill, SceneNode } from '@pairdraw/scene-graph'

const RED: Fill = { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }

function twoRectangles() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const first = graph.createNode('RECTANGLE', pageId)
  const second = graph.createNode('RECTANGLE', pageId)
  return { graph, pageId, first, second }
}

describe('empty node values', () => {
  test('new layers share one frozen value for each empty list and record', () => {
    const { first, second } = twoRectangles()
    for (const field of ['fills', 'strokes', 'effects', 'pluginData', 'exportSettings'] as const) {
      expect(first[field]).toBe(second[field])
      expect(Object.isFrozen(first[field])).toBe(true)
    }
    for (const field of ['boundVariables', 'componentPropertyValues', 'variableModes'] as const) {
      expect(first[field]).toBe(second[field])
      expect(Object.isFrozen(first[field])).toBe(true)
    }
  })

  test('a layer keeps its own child list', () => {
    const { first, second } = twoRectangles()
    expect(first.childIds).not.toBe(second.childIds)
    expect(Object.isFrozen(first.childIds)).toBe(false)
  })

  test('an empty value given at creation or by an update is stored as the shared one', () => {
    const { graph, pageId, first } = twoRectangles()
    const created = graph.createNode('ELLIPSE', pageId, { strokes: [], boundVariables: {} })
    expect(created.strokes).toBe(first.strokes)
    expect(created.boundVariables).toBe(first.boundVariables)

    graph.updateNode(created.id, { fills: [RED] })
    graph.updateNode(created.id, { fills: [], effects: [] })
    expect(created.fills).toBe(first.fills)
    expect(created.effects).toBe(first.effects)
  })

  test('a preview that clears a list stores the shared one', () => {
    const { graph, first, second } = twoRectangles()
    graph.updateNode(second.id, { fills: [RED] })
    graph.updateNodePreview(second.id, { fills: [] })
    expect(second.fills).toBe(first.fills)
  })

  test('writing into an empty value throws and reaches no other layer', () => {
    const { first, second } = twoRectangles()
    // oxlint-disable-next-line pairdraw/no-node-collection-write -- the write under test
    expect(() => first.fills.push(RED)).toThrow(TypeError)
    expect(() => {
      // oxlint-disable-next-line pairdraw/no-node-collection-write -- the write under test
      first.boundVariables.width = 'VariableID:1:1'
    }).toThrow(TypeError)
    expect(second.fills).toEqual([])
    expect(second.boundVariables).toEqual({})
  })

  test('replacing a value changes only that layer', () => {
    const { graph, first, second } = twoRectangles()
    graph.updateNode(first.id, { fills: [RED], boundVariables: { width: 'VariableID:1:1' } })
    expect(first.fills).toEqual([RED])
    expect(first.boundVariables).toEqual({ width: 'VariableID:1:1' })
    expect(second.fills).toEqual([])
    expect(second.boundVariables).toEqual({})
  })

  test('a copy made with structuredClone can be written into', () => {
    const { first } = twoRectangles()
    const copy: SceneNode = structuredClone(first)
    // oxlint-disable-next-line pairdraw/no-node-collection-write -- the write under test
    copy.fills.push(RED)
    // oxlint-disable-next-line pairdraw/no-node-collection-write -- the write under test
    copy.boundVariables.width = 'VariableID:1:1'
    expect(copy.fills).toEqual([RED])
    expect(first.fills).toEqual([])
  })
})

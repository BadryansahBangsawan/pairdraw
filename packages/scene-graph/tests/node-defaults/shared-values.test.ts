import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import type { Fill, SceneNode, SourceMetadata } from '@pairdraw/scene-graph'
import { createDefaultSourceMetadata } from '@pairdraw/scene-graph/node-defaults'

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

describe('empty source metadata', () => {
  test('new layers share one frozen value for each empty source list and the raw fields', () => {
    const { first, second } = twoRectangles()
    const values = (node: SceneNode) => [
      node.source.editedFields,
      node.source.fig.rawNodeFields,
      node.source.fig.symbolOverrides,
      node.source.fig.componentPropAssignments,
      node.source.fig.derivedSymbolData
    ]
    for (const [index, value] of values(first).entries()) {
      expect(value).toBe(values(second)[index])
      expect(Object.isFrozen(value)).toBe(true)
    }
    expect(first.source).not.toBe(second.source)
    expect(first.source.fig).not.toBe(second.source.fig)
  })

  test('source metadata given with empty values stores the shared ones', () => {
    const { graph, pageId, first } = twoRectangles()
    const source = structuredClone(first.source)
    const created = graph.createNode('FRAME', pageId, { source: { ...source, id: '1:2' } })
    expect(created.source.id).toBe('1:2')
    expect(created.source.editedFields).toBe(first.source.editedFields)
    expect(created.source.fig.rawNodeFields).toBe(first.source.fig.rawNodeFields)

    graph.updateNode(created.id, { source: structuredClone(created.source) })
    expect(created.source.fig.symbolOverrides).toBe(first.source.fig.symbolOverrides)
  })

  test('partial source metadata, as libraries and plugins pass it, is accepted as before', () => {
    const { graph, pageId } = twoRectangles()
    const partial: Partial<SourceMetadata> = { id: null }
    const created = graph.createNode('FRAME', pageId, { source: partial as SourceMetadata })
    expect(Object.keys(created.source)).toEqual(['id'])
    expect(created.source.id).toBeNull()
    const noFig: Partial<SourceMetadata> = { format: null, id: '1:1', editedFields: [] }
    graph.updateNode(created.id, { source: noFig as SourceMetadata })
    expect(created.source.id).toBe('1:1')
  })

  test('source metadata given to a layer is not written into', () => {
    const { graph, pageId } = twoRectangles()
    const source = createDefaultSourceMetadata()
    const editedFields: string[] = []
    const given: SourceMetadata = { ...source, editedFields, fig: { ...source.fig } }
    const created = graph.createNode('FRAME', pageId, { source: given })
    expect(given.editedFields).toBe(editedFields)
    expect(Object.isFrozen(given.editedFields)).toBe(false)
    expect(created.source).not.toBe(given)
    expect(created.source.editedFields).toEqual([])
  })

  test('writing into empty raw fields throws; replacing them stays on that layer', () => {
    const { first, second } = twoRectangles()
    expect(() => {
      // oxlint-disable-next-line pairdraw/no-node-collection-write -- the write under test
      first.source.fig.rawNodeFields.strokeJoin = 'BEVEL'
    }).toThrow(TypeError)
    first.source.fig.rawNodeFields = { strokeJoin: 'BEVEL' }
    first.source.id = '9:9'
    expect(second.source.fig.rawNodeFields).toEqual({})
    expect(second.source.id).toBeNull()
  })
})

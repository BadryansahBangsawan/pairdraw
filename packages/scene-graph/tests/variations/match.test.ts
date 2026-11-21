import { describe, expect, test } from 'bun:test'

import { SceneGraph, type NodeType, type SceneNode } from '@pairdraw/scene-graph'
import { matchLayers } from '@pairdraw/scene-graph/variations'

function page(graph: SceneGraph): string {
  return graph.getPages()[0].id
}

function add(graph: SceneGraph, parent: SceneNode | string, type: NodeType, name: string) {
  return graph.createNode(type, typeof parent === 'string' ? parent : parent.id, { name })
}

describe('matchLayers', () => {
  test('pairs the roots whatever their names', () => {
    const graph = new SceneGraph()
    const original = add(graph, page(graph), 'FRAME', 'Card')
    const version = add(graph, page(graph), 'FRAME', 'V1 · Calmer')
    expect(matchLayers(graph, original.id, version.id)).toEqual(
      new Map([[version.id, original.id]])
    )
  })

  test('pairs children by type and name, wherever the version moved them', () => {
    const graph = new SceneGraph()
    const original = add(graph, page(graph), 'FRAME', 'Card')
    const title = add(graph, original, 'TEXT', 'Title')
    const body = add(graph, original, 'TEXT', 'Body')
    const icon = add(graph, original, 'VECTOR', 'Icon')

    const version = add(graph, page(graph), 'FRAME', 'V1')
    const vIcon = add(graph, version, 'VECTOR', 'Icon')
    const vBody = add(graph, version, 'TEXT', 'Body')
    const vTitle = add(graph, version, 'TEXT', 'Title')

    const pairs = matchLayers(graph, original.id, version.id)
    expect(pairs.get(vTitle.id)).toBe(title.id)
    expect(pairs.get(vBody.id)).toBe(body.id)
    expect(pairs.get(vIcon.id)).toBe(icon.id)
  })

  test('pairs renamed layers of the same type by their order, after the named ones', () => {
    const graph = new SceneGraph()
    const original = add(graph, page(graph), 'FRAME', 'Card')
    const first = add(graph, original, 'RECTANGLE', 'Rectangle 1')
    const second = add(graph, original, 'RECTANGLE', 'Rectangle 2')

    const version = add(graph, page(graph), 'FRAME', 'V1')
    const vBackdrop = add(graph, version, 'RECTANGLE', 'Backdrop')
    const vSecond = add(graph, version, 'RECTANGLE', 'Rectangle 2')

    const pairs = matchLayers(graph, original.id, version.id)
    expect(pairs.get(vSecond.id)).toBe(second.id)
    expect(pairs.get(vBackdrop.id)).toBe(first.id)
  })

  test('never pairs layers of different types, and leaves extra layers unpaired', () => {
    const graph = new SceneGraph()
    const original = add(graph, page(graph), 'FRAME', 'Card')
    add(graph, original, 'TEXT', 'Label')

    const version = add(graph, page(graph), 'FRAME', 'V1')
    const vLabel = add(graph, version, 'FRAME', 'Label')
    const vBadge = add(graph, version, 'TEXT', 'Badge')

    const pairs = matchLayers(graph, original.id, version.id)
    expect(pairs.has(vLabel.id)).toBe(false)
    // The text pairs by type and order even though its name changed.
    expect(pairs.has(vBadge.id)).toBe(true)
    expect(pairs.size).toBe(2)
  })

  test('descends only into paired layers', () => {
    const graph = new SceneGraph()
    const original = add(graph, page(graph), 'FRAME', 'Card')
    const header = add(graph, original, 'FRAME', 'Header')
    const title = add(graph, header, 'TEXT', 'Title')

    const version = add(graph, page(graph), 'FRAME', 'V1')
    const vHeader = add(graph, version, 'FRAME', 'Header')
    const vTitle = add(graph, vHeader, 'TEXT', 'Title')
    const vGroup = add(graph, version, 'GROUP', 'Footer')
    const vNested = add(graph, vGroup, 'TEXT', 'Title')

    const pairs = matchLayers(graph, original.id, version.id)
    expect(pairs.get(vHeader.id)).toBe(header.id)
    expect(pairs.get(vTitle.id)).toBe(title.id)
    expect(pairs.has(vGroup.id)).toBe(false)
    expect(pairs.has(vNested.id)).toBe(false)
  })
})

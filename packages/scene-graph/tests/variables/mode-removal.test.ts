import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

describe('removing a variable collection', () => {
  test('clears the layer overrides that named its modes', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const collection = graph.createCollection('Theme')
    const dark = graph.createMode(collection.id, 'Dark')
    if (!dark) throw new Error('the collection has no second mode')
    const frame = graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 100 })
    graph.updateNode(frame.id, { variableModes: { [collection.id]: dark } })

    graph.removeCollection(collection.id)

    expect(graph.getNode(frame.id)?.variableModes).toEqual({})
  })
})

describe('removing a variable mode', () => {
  test('clears the layer overrides that named it', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const collection = graph.createCollection('Theme')
    const dark = graph.createMode(collection.id, 'Dark')
    if (!dark) throw new Error('the collection has no second mode')
    const frame = graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 100 })
    const instance = graph.createNode('INSTANCE', page.id, {
      name: 'Badge',
      width: 10,
      height: 10
    })
    graph.updateNode(frame.id, { variableModes: { [collection.id]: dark } })
    graph.updateNode(instance.id, { variableModes: { [collection.id]: dark } })

    graph.removeMode(collection.id, dark)

    expect(graph.getNode(frame.id)?.variableModes).toEqual({})
    expect(graph.getNode(instance.id)?.variableModes).toEqual({})
  })

  test('leaves another collection’s overrides alone', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const theme = graph.createCollection('Theme')
    const density = graph.createCollection('Density')
    const dark = graph.createMode(theme.id, 'Dark')
    const compact = graph.createMode(density.id, 'Compact')
    if (!dark || !compact) throw new Error('a collection has no second mode')
    const frame = graph.createNode('FRAME', page.id, { name: 'Card', width: 100, height: 100 })
    graph.updateNode(frame.id, {
      variableModes: { [theme.id]: dark, [density.id]: compact }
    })

    graph.removeMode(density.id, compact)

    expect(graph.getNode(frame.id)?.variableModes).toEqual({ [theme.id]: dark })
  })
})

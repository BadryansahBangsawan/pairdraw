import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { PAIRDRAW_PLUGIN_DATA, readPluginData } from '@pairdraw/scene-graph/plugin-data'
import { copyVersion } from '@pairdraw/scene-graph/variations'

import { expectDefined } from '../helpers/assert'

describe('copyVersion', () => {
  test('main components inside the copy become instances of the components they copy', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const board = graph.createNode('FRAME', pageId, { name: 'Board' })
    const badge = graph.createNode('COMPONENT', board.id, { name: 'Badge', x: 10, y: 20 })
    graph.createNode('TEXT', badge.id, { name: 'Label', text: 'New' })
    const set = graph.createNode('COMPONENT_SET', board.id, { name: 'Toggle' })
    const on = graph.createNode('COMPONENT', set.id, { name: 'State=On' })
    graph.createNode('RECTANGLE', board.id, { name: 'Backdrop' })

    const copy = expectDefined(copyVersion(graph, board.id, pageId, { name: 'V1' }))

    const [badgeCopy, setCopy, backdrop] = graph.getChildren(copy.id)
    expect(badgeCopy).toMatchObject({ type: 'INSTANCE', componentId: badge.id, x: 10, y: 20 })
    expect(setCopy).toMatchObject({ type: 'FRAME', name: 'Toggle', componentKey: null })
    expect(graph.getChildren(setCopy.id)[0]).toMatchObject({
      type: 'INSTANCE',
      componentId: on.id
    })
    expect(backdrop).toMatchObject({ type: 'RECTANGLE', name: 'Backdrop' })
    // Each stand-in names what it stands for, which is how a pick knows it.
    const standIn = (node: typeof badgeCopy) =>
      readPluginData(node.pluginData, PAIRDRAW_PLUGIN_DATA.variationStandIn)
    expect(standIn(badgeCopy)).toBe(badge.id)
    expect(standIn(setCopy)).toBe(set.id)
    expect(standIn(backdrop)).toBeUndefined()
    // No copy adds a main component.
    const components = [...graph.getAllNodes()].filter((node) => node.type === 'COMPONENT')
    expect(components.map((node) => node.id).toSorted()).toEqual([badge.id, on.id].toSorted())
  })

  test('a main component copied whole becomes a plain frame that keeps its layers', () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const button = graph.createNode('COMPONENT', pageId, {
      name: 'Button',
      componentKey: 'key-1',
      isPublishable: true
    })
    graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })

    const copy = expectDefined(copyVersion(graph, button.id, pageId, { name: 'V1' }))

    expect(copy).toMatchObject({ type: 'FRAME', componentKey: null, isPublishable: false })
    expect(graph.getChildren(copy.id).map((node) => node.name)).toEqual(['Label'])
  })
})

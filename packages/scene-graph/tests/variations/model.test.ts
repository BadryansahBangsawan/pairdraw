import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  originalChangedSince,
  readVariationSet,
  variationFingerprint,
  variationSetForOriginal,
  variationSetOf,
  variationSetsOnPage,
  versionOf,
  withVariationSet
} from '@pairdraw/scene-graph/variations'

import { expectDefined } from '../helpers/assert'

function setUp() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const original = graph.createNode('FRAME', pageId, { name: 'Card', width: 200, height: 100 })
  graph.createNode('TEXT', original.id, { name: 'Title', text: 'Hello' })
  const section = graph.createNode('SECTION', pageId, { name: 'Variations · Card' })
  graph.updateNode(section.id, {
    pluginData: withVariationSet(section, {
      version: 1,
      originalId: original.id,
      originalFingerprint: variationFingerprint(graph, original.id)
    })
  })
  const version = expectDefined(graph.cloneTree(original.id, section.id, { name: 'V1' }))
  return { graph, pageId, original, section, version }
}

describe('variation sets', () => {
  test('a section carries its mark as plugin data, and only a section reads one', () => {
    const { graph, original, section } = setUp()
    expect(readVariationSet(expectDefined(graph.getNode(section.id)))).toMatchObject({
      version: 1,
      originalId: original.id
    })
    expect(readVariationSet({ type: 'FRAME', pluginData: section.pluginData })).toBeNull()
    graph.updateNode(section.id, { pluginData: withVariationSet(section, null) })
    expect(variationSetOf(graph, section.id)).toBeNull()
  })

  test('the set is found from its section, a version, or a layer inside a version', () => {
    const { graph, original, section, version } = setUp()
    const title = expectDefined(graph.getNode(version.childIds[0]))
    for (const id of [section.id, version.id, title.id]) {
      const view = expectDefined(variationSetOf(graph, id))
      expect(view.section.id).toBe(section.id)
      expect(view.original?.id).toBe(original.id)
      expect(view.versions.map((node) => node.id)).toEqual([version.id])
      expect(versionOf(graph, view, id)?.id).toBe(id === section.id ? undefined : version.id)
    }
    expect(variationSetOf(graph, original.id)).toBeNull()
  })

  test('a set is listed on its page and found from its original', () => {
    const { graph, pageId, original, section } = setUp()
    expect(variationSetsOnPage(graph, pageId).map((view) => view.section.id)).toEqual([section.id])
    expect(variationSetForOriginal(graph, original.id)?.section.id).toBe(section.id)
  })

  test('a deleted original reads as gone', () => {
    const { graph, original, section } = setUp()
    graph.deleteNode(original.id)
    expect(variationSetOf(graph, section.id)?.original).toBeNull()
  })

  test('the original reads as changed once it looks different from when the set was made', () => {
    const { graph, original, section } = setUp()
    const view = () => expectDefined(variationSetOf(graph, section.id))
    expect(originalChangedSince(graph, view())).toBe(false)
    // Moving the original, or its auto layout parent placing it, is no change to it.
    graph.updateNode(original.id, { x: 500, y: 300 })
    expect(originalChangedSince(graph, view())).toBe(false)
    graph.updateNode(original.childIds[0], { text: 'Goodbye' })
    expect(originalChangedSince(graph, view())).toBe(true)
  })
})

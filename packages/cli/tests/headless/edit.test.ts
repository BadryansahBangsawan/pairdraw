import { expect, test } from 'bun:test'
import { join } from 'node:path'

import { FIXTURES } from '#cli-tests/helpers/paths'

import { computeAllLayouts, getTextMeasurer } from '@pairdraw/core/layout'
import { fontManager } from '@pairdraw/core/text'
import { SceneGraph } from '@pairdraw/scene-graph'

import { editDocument, measureTextHeadlessly } from '#cli/headless'

test('sizes the text an edit writes in the fonts its characters load after it', async () => {
  // A family nothing loaded yet, as a script's new characters need a web font fetched again.
  const family = 'Edit Test Han'
  const font = await Bun.file(join(FIXTURES, 'fonts', 'NotoSansSC-Regular.ttf')).arrayBuffer()
  fontManager.setHostFontLoader(async (name) => (name === family ? font : null))
  try {
    await measureTextHeadlessly()
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const id = await editDocument(
      graph,
      () =>
        graph.createNode('TEXT', pageId, {
          text: '中文字',
          fontFamily: family,
          fontSize: 40,
          textAutoResize: 'WIDTH_AND_HEIGHT'
        }).id
    )
    const node = graph.getNode(id)
    if (!node) throw new Error('Expected the text')
    const measured = getTextMeasurer()?.(node)
    if (!measured) throw new Error('Expected the text measured in its font')
    // Each Han character is one em wide in the font, so three at 40 px are 120 px; a stand-in
    // measures them otherwise.
    expect(node.width).toBe(120)
    expect(node.width).toBe(measured.width)
    expect(node.height).toBe(measured.height)
  } finally {
    fontManager.setHostFontLoader(null)
  }
})

test('brings the instances of a component an edit changes up to date with it', async () => {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const component = graph.createNode('COMPONENT', pageId, {
    name: 'Badge',
    layoutMode: 'HORIZONTAL',
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG'
  })
  const box = graph.createNode('RECTANGLE', component.id, { name: 'Box', width: 40, height: 40 })
  computeAllLayouts(graph)
  const instance = graph.createInstance(component.id, pageId, { x: 200, y: 0 })
  if (!instance) throw new Error('Expected the instance')
  expect([instance.width, instance.height]).toEqual([40, 40])

  await editDocument(graph, () => graph.updateNode(box.id, { width: 100, height: 80 }))

  expect([component.width, component.height]).toEqual([100, 80])
  expect([instance.width, instance.height]).toEqual([100, 80])
  const copy = graph.getNode(instance.childIds[0])
  expect([copy?.width, copy?.height]).toEqual([100, 80])
})

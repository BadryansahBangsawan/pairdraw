import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { renderNodesToHTML } from '#core/io/formats/html'

function graphWithColorVariable() {
  const graph = new SceneGraph()
  graph.addCollection({
    id: 'theme',
    name: 'Theme',
    modes: [{ modeId: 'light', name: 'Light' }],
    defaultModeId: 'light',
    variableIds: []
  })
  graph.addVariable({
    id: 'primary',
    name: 'Primary',
    type: 'COLOR',
    collectionId: 'theme',
    valuesByMode: { light: { r: 1, g: 0, b: 0, a: 1 } },
    description: '',
    hiddenFromPublishing: false
  })
  return graph
}

describe('variables in HTML export', () => {
  test('declares the custom property a bound paint references', async () => {
    const graph = graphWithColorVariable()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      name: 'Card',
      width: 200,
      height: 100,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          visible: true,
          opacity: 1
        }
      ],
      boundVariables: { 'fills/0/color': 'primary' }
    })

    const { html } = await renderNodesToHTML(graph, [frame.id], { html: 'standalone' })

    expect(html).toMatch(/background-color: var\(--[a-z0-9-]+\)/)
    expect(html).toMatch(/--[a-z0-9-]+: #(FF0000|ff0000)/)
  })

  test('declares the tokens of every exported root', async () => {
    const graph = graphWithColorVariable()
    const page = graph.getPages()[0]
    const bound = graph.createNode('RECTANGLE', page.id, {
      name: 'Bound',
      width: 40,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          visible: true,
          opacity: 1
        }
      ],
      boundVariables: { 'fills/0/color': 'primary' }
    })
    const plain = graph.createNode('RECTANGLE', page.id, {
      name: 'Plain',
      x: 100,
      width: 40,
      height: 40,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, visible: true, opacity: 1 }]
    })

    const { html } = await renderNodesToHTML(graph, [plain.id, bound.id], { html: 'standalone' })

    expect(html).toContain('background-color: var(--')
    expect(html).toMatch(/--[a-z0-9-]+: #(FF0000|ff0000)/)
  })
})

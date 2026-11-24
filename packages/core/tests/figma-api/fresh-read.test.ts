import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { FigmaAPI } from '#core/figma-api'

const RED = {
  type: 'SOLID' as const,
  color: { r: 1, g: 0, b: 0, a: 1 },
  opacity: 1,
  visible: true
}

/** A tool or the CLI reads `figma.graph` directly, without a flush of its own. */
function setup() {
  const graph = new SceneGraph()
  return { graph, figma: new FigmaAPI(graph) }
}

describe('reads freshen the edits before them', () => {
  test('a graph read sees the layout an edit implies', () => {
    const { figma } = setup()
    const card = figma.createFrame()
    card.name = 'Card'
    card.layoutMode = 'VERTICAL'
    card.resize(100, 100)
    card.counterAxisSizingMode = 'AUTO'
    const row = figma.createRectangle()
    card.appendChild(row)
    row.resize(180, 20)

    const read = figma.graph.getNode(card.id)

    expect(read?.width).toBe(180)
  })

  test('a graph read sees an instance after its component changed', () => {
    const { figma } = setup()
    const component = figma.createComponent()
    component.name = 'Button'
    const label = figma.createRectangle()
    label.name = 'Label'
    component.appendChild(label)
    const instance = component.createInstance()
    const labelInInstance = figma.graph.getNode(instance.id)?.childIds[0]
    if (!labelInInstance) throw new Error('Missing the instance child')

    label.fills = [RED]

    const read = figma.graph.getNode(labelInInstance)
    expect(read?.fills[0]).toMatchObject({ type: 'SOLID', color: { r: 1, g: 0, b: 0 } })
  })
})

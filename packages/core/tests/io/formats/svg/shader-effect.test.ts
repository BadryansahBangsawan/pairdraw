import { describe, expect, test } from 'bun:test'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph } from '@pairdraw/scene-graph'

describe('shader effects in SVG export', () => {
  test('a node whose only effect is a visible shader effect does not emit NaN', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    if (!page) throw new Error('The fixture has no page')
    const node = graph.createNode('RECTANGLE', page.id, {
      name: 'Shaded',
      width: 40,
      height: 40,
      // A shader effect only changes a layer that paints, so the layer needs a paint to export.
      fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }],
      effects: [{ type: 'SHADER', source: 'void main() {}', visible: true }]
    })

    const svg = renderNodesToSVG(graph, page.id, [node.id], { xmlDeclaration: false })
    expect(svg).not.toBeNull()
    expect(svg).not.toContain('NaN')
  })
})

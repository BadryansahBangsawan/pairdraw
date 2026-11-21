import { describe, expect, test } from 'bun:test'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph } from '@pairdraw/scene-graph'

describe('SVG stroke paints', () => {
  // The canvas paints a gradient stroke through a shader, so the export must reference the
  // gradient rather than flatten it to the stroke's base colour.
  test('exports a gradient stroke as a gradient reference', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 40,
      height: 40,
      strokes: [
        {
          type: 'GRADIENT_LINEAR',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true,
          weight: 2,
          align: 'INSIDE',
          gradientStops: [
            { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
            { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
          ],
          gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
        }
      ]
    })

    const svg = renderNodesToSVG(graph, page.id, [node.id]) ?? ''
    expect(svg).toMatch(/stroke="url\(#grad\d+\)"/)
    expect(svg).toMatch(/<linearGradient id="grad\d+"/)
    expect(svg).not.toContain('stroke="#FF0000"')
  })
})

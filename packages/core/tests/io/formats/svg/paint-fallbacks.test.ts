import { describe, expect, test } from 'bun:test'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'

/** The rectangle a fill kind is exported on. */
function exported(fill: Fill): string | null {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const node = graph.createNode('RECTANGLE', page.id, { width: 40, height: 40, fills: [fill] })
  return renderNodesToSVG(graph, page.id, [node.id])
}

describe('SVG paint fallbacks', () => {
  // The canvas draws a pattern, noise or custom paint as its own colour when the format has no
  // element for it, so an export must show the same colour instead of dropping the layer.
  for (const type of ['PATTERN', 'NOISE', 'CUSTOM'] as const) {
    test(`draws a ${type} fill as the colour the canvas falls back to`, () => {
      const svg = exported({
        type,
        color: { r: 0.2, g: 0.4, b: 0.6, a: 1 },
        opacity: 1,
        visible: true
      })
      expect(svg).not.toBeNull()
      expect(svg).toMatch(/fill="#336699"/)
    })
  }
})

import { expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

const SVG =
  '<svg width="10" height="10"><path d="M0 0 H10 V10 H0 Z" fill="color(display-p3 1 0 0)"/></svg>'

test('createNodeFromSvg reads paint into the document profile', () => {
  const graph = new SceneGraph()
  graph.documentColorSpace = 'display-p3'
  const frame = new FigmaAPI(graph).createNodeFromSvg(SVG)
  const paint = [...graph.nodes.values()]
    .flatMap((node) => node.fills ?? [])
    .find((fill) => fill.type === 'SOLID' && fill.color.r === 1 && fill.color.g === 0)
  expect(frame.type).toBe('FRAME')
  expect(paint?.color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
})

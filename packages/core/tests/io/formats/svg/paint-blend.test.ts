import { describe, expect, test } from 'bun:test'

import { renderNodesToSVG } from '@pairdraw/core/io/formats/svg'
import { SceneGraph } from '@pairdraw/scene-graph'

/** The `<rect>`s a rectangle's export writes, with their attributes as text. */
function rects(svg: string | null): string[] {
  return [...(svg ?? '').matchAll(/<rect[^>]*\/>/g)].map(([match]) => match)
}

describe('SVG paint blend modes', () => {
  // The canvas blends each fill with what is beneath it, so a stacked fill keeps its blend mode
  // in the export instead of compositing as a plain source-over layer.
  test('writes a paint blend mode with the fill it styles', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 40,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 0.5,
          visible: true,
          blendMode: 'MULTIPLY'
        },
        { type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }
      ]
    })

    const [first, second] = rects(renderNodesToSVG(graph, page.id, [node.id]))
    expect(first).toContain('style="mix-blend-mode: multiply"')
    expect(second).not.toContain('mix-blend-mode')
  })
})

test('keeps the blend mode off a plain stroke', () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const node = graph.createNode('RECTANGLE', page.id, {
    width: 40,
    height: 40,
    fills: [
      {
        type: 'SOLID',
        color: { r: 1, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
        blendMode: 'MULTIPLY'
      }
    ],
    strokes: [
      {
        type: 'SOLID',
        color: { r: 0, g: 0, b: 1, a: 1 },
        opacity: 1,
        visible: true,
        weight: 2,
        align: 'CENTER'
      }
    ]
  })

  const elements = rects(renderNodesToSVG(graph, page.id, [node.id]))
  const stroked = elements.filter((element) => element.includes('stroke="#0000FF"'))
  expect(stroked).toHaveLength(1)
  expect(stroked[0]).not.toContain('mix-blend-mode')
  expect(elements.some((element) => element.includes('mix-blend-mode: multiply'))).toBe(true)
})

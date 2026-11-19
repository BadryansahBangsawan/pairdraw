import { describe, expect, test } from 'bun:test'

import { SceneGraph, type Stroke } from '@pairdraw/scene-graph'

import { renderNodesToSVG } from '#core/io/formats/svg'

const stroke = (align: Stroke['align'], weight = 2): Stroke => ({
  type: 'SOLID',
  color: { r: 0.9, g: 0.3, b: 0, a: 1 },
  opacity: 1,
  visible: true,
  weight,
  align
})

function exportText(strokes: Stroke[], align: Stroke['align'] = 'OUTSIDE'): string {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const node = graph.createNode('TEXT', pageId, {
    text: 'Stroke me',
    width: 200,
    height: 40,
    fontSize: 32,
    strokes,
    strokeAlign: align,
    strokeWeight: strokes[0]?.weight ?? 1
  })
  const svg = renderNodesToSVG(graph, pageId, [node.id], { xmlDeclaration: false })
  if (!svg) throw new Error('nothing exported')
  return svg
}

describe('stroked text exported to SVG', () => {
  test('a visible stroke reaches the text element', () => {
    const svg = exportText([stroke('OUTSIDE')])
    expect(svg).toContain('stroke="#E64D00"')
    // Twice the weight, because only the half outside the glyphs shows behind the fill.
    expect(svg).toContain('stroke-width="4"')
  })

  test('an outside stroke paints behind the glyphs, as the canvas draws it', () => {
    const svg = exportText([stroke('OUTSIDE')])
    expect(svg).toContain('paint-order="stroke"')
  })

  test('a centred stroke keeps its own weight over the fill', () => {
    const svg = exportText([stroke('CENTER')], 'CENTER')
    expect(svg).toContain('stroke-width="2"')
    expect(svg).not.toContain('paint-order')
    expect(svg).not.toContain('stroke-width="4"')
  })

  test('a hidden stroke exports none', () => {
    const svg = exportText([{ ...stroke('OUTSIDE'), visible: false }])
    expect(svg).not.toContain('stroke=')
  })

  test('text without a stroke exports none', () => {
    const svg = exportText([])
    expect(svg).not.toContain('stroke=')
  })
})

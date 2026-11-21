import { describe, expect, test } from 'bun:test'

import {
  sceneNodeToDesignDocument,
  type DesignElement,
  type DesignNode
} from '#dom-css/export/index'
import { sceneNodesToTailwindJSX } from '#dom-css/export/tailwind-jsx'

import { SceneGraph, type SceneNode, type Stroke } from '@pairdraw/scene-graph'

function element(node: DesignNode | undefined): DesignElement {
  if (node?.type !== 'element') throw new Error('Expected an element')
  return node
}

/** A solid stroke of `color`, its weight and alignment. */
function solid(color: [number, number, number], weight: number, align: Stroke['align']): Stroke {
  return {
    type: 'SOLID',
    color: { r: color[0], g: color[1], b: color[2], a: 1 },
    opacity: 1,
    visible: true,
    weight,
    align
  }
}

/** The projected element for a 100 × 60 rectangle carrying `strokes`. */
function rectangleWith(strokes: Stroke[]) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const node = graph.createNode('RECTANGLE', page, { width: 100, height: 60, strokes })
  const root = element(sceneNodeToDesignDocument(graph, node.id).children[0])
  return { graph, node: node as SceneNode, root }
}

describe('every visible stroke projected to CSS', () => {
  test('keeps the first stroke as the border and draws the rest as rings over it', () => {
    const { root } = rectangleWith([solid([1, 0, 0], 2, 'CENTER'), solid([0, 0, 1], 4, 'INSIDE')])
    expect(root.inlineStyle?.border).toBe('2px solid #FF0000')
    expect(root.inlineStyle?.['box-shadow']).toContain('inset')
    expect(root.inlineStyle?.['box-shadow']).toContain('#0000FF')
  })

  test('keeps every stroke’s colour and alignment', () => {
    const { root } = rectangleWith([
      solid([1, 0, 0], 2, 'CENTER'),
      solid([0, 1, 0], 3, 'OUTSIDE'),
      solid([0, 0, 1], 4, 'INSIDE')
    ])
    const shadow = root.inlineStyle?.['box-shadow'] ?? ''
    expect(shadow).toContain('#00FF00')
    expect(shadow).toContain('#0000FF')
    expect(shadow).toContain('inset')
    // The outside ring is written without `inset`; the inside one with it.
    expect(shadow.indexOf('#00FF00')).toBeLessThan(shadow.indexOf('inset'))
  })

  test('skips a hidden stroke', () => {
    const hidden = { ...solid([0, 1, 0], 3, 'INSIDE'), visible: false }
    const { root } = rectangleWith([solid([1, 0, 0], 2, 'CENTER'), hidden])
    expect(root.inlineStyle?.border).toBe('2px solid #FF0000')
    expect(root.inlineStyle?.['box-shadow']).toBeUndefined()
  })

  test('Tailwind writes each stroke as a class or an arbitrary shadow', () => {
    const { graph, node } = rectangleWith([
      solid([1, 0, 0], 2, 'CENTER'),
      solid([0, 0, 1], 4, 'OUTSIDE')
    ])
    const jsx = sceneNodesToTailwindJSX(graph, [node.id])
    expect(jsx).toContain('border-[#FF0000]')
    expect(jsx).toMatch(/shadow-\[.*#0000FF/)
  })
})

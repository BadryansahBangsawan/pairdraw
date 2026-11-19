import { describe, expect, test } from 'bun:test'

import { sceneNodeToDesignDocument, type DesignElement } from '#dom-css/export/index'
import { designDocumentToSceneGraph } from '#dom-css/import/scene-graph'

import { SceneGraph, type Fill, type SceneNode } from '@pairdraw/scene-graph'
import { parseCSSBackgroundImages } from '@pairdraw/scene-graph/css'

function gradientFill(value: string, width: number, height: number): Fill {
  const [layer] = parseCSSBackgroundImages(value, width, height)
  if (layer?.kind !== 'gradient') throw new Error(`Not a gradient: ${value}`)
  return layer.fill
}

function frame(fills: Fill[], width = 200, height = 100): { graph: SceneGraph; node: SceneNode } {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  if (!page) throw new Error('No page')
  const node = graph.createNode('FRAME', page.id, { width, height, fills })
  return { graph, node }
}

function projected(graph: SceneGraph, node: SceneNode): DesignElement {
  const [element] = sceneNodeToDesignDocument(graph, node.id).children
  if (element?.type !== 'element') throw new Error('Expected an element')
  return element
}

describe('gradient fills in design-to-code', () => {
  test('a linear gradient exports as the CSS gradient it draws', () => {
    const { graph, node } = frame([gradientFill('linear-gradient(to right, red, blue)', 200, 100)])
    const style = projected(graph, node).inlineStyle ?? {}
    expect(style['background-image']).toBe('linear-gradient(90deg, #FF0000 0%, #0000FF 100%)')
    expect(style['background-color']).toBeUndefined()
  })

  test('an angled gradient keeps its direction and stops', () => {
    const { graph, node } = frame([
      gradientFill('linear-gradient(45deg, rgba(255, 0, 0, 0.5) 20%, blue 80%)', 200, 100)
    ])
    expect(projected(graph, node).inlineStyle?.['background-image']).toBe(
      'linear-gradient(45deg, rgba(255, 0, 0, 0.5) 20%, #0000FF 80%)'
    )
  })

  test('a solid under a gradient exports both, the gradient on top', () => {
    const solid: Fill = {
      type: 'SOLID',
      color: { r: 0, g: 0.5, b: 0, a: 1 },
      opacity: 1,
      visible: true
    }
    const { graph, node } = frame([solid, gradientFill('linear-gradient(red, blue)', 200, 100)])
    const style = projected(graph, node).inlineStyle ?? {}
    expect(style['background-color']).toBe('#008000')
    expect(style['background-image']).toBe('linear-gradient(180deg, #FF0000 0%, #0000FF 100%)')
  })

  test('several gradient layers export top-first, as CSS paints them', () => {
    const { graph, node } = frame([
      gradientFill('radial-gradient(green, yellow)', 200, 100),
      gradientFill('linear-gradient(red, blue)', 200, 100)
    ])
    const value = projected(graph, node).inlineStyle?.['background-image'] ?? ''
    const layers = value.split(/,(?![^(]*\))/).map((layer) => layer.trim())
    expect(layers[0]?.startsWith('linear-gradient(')).toBe(true)
    expect(layers[1]?.startsWith('radial-gradient(')).toBe(true)
  })

  test('import(export(x)) keeps a linear gradient painting the same', () => {
    const { graph, node } = frame([
      gradientFill('linear-gradient(100deg, #0c2b45, #12456b)', 200, 100)
    ])
    const element = projected(graph, node)
    const imported = designDocumentToSceneGraph({ type: 'document', children: [element] })
    const page = imported.getPages()[0]
    const layer = page ? imported.getChildren(page.id)[0] : undefined
    const fill = layer?.fills[0]
    if (fill?.type !== 'GRADIENT_LINEAR')
      throw new Error(`Expected a linear gradient, got ${fill?.type}`)
    const original = node.fills[0]
    if (original?.type !== 'GRADIENT_LINEAR') throw new Error('Expected a linear gradient')
    expect(fill.gradientStops).toEqual(original.gradientStops)
    const t = fill.gradientTransform
    const o = original.gradientTransform
    if (!t || !o) throw new Error('Missing gradient transform')
    for (const key of ['m00', 'm01', 'm02', 'm10', 'm11', 'm12'] as const) {
      expect(t[key]).toBeCloseTo(o[key], 5)
    }
  })

  test('import(export(x)) keeps a radial gradient painting the same', () => {
    const { graph, node } = frame([
      gradientFill('radial-gradient(circle 50px at 25% 75%, red, blue)', 200, 100)
    ])
    const element = projected(graph, node)
    const imported = designDocumentToSceneGraph({ type: 'document', children: [element] })
    const page = imported.getPages()[0]
    const layer = page ? imported.getChildren(page.id)[0] : undefined
    const fill = layer?.fills[0]
    if (fill?.type !== 'GRADIENT_RADIAL')
      throw new Error(`Expected a radial gradient, got ${fill?.type}`)
    const original = node.fills[0]
    if (original?.type !== 'GRADIENT_RADIAL') throw new Error('Expected a radial gradient')
    const t = fill.gradientTransform
    const o = original.gradientTransform
    if (!t || !o) throw new Error('Missing gradient transform')
    for (const key of ['m00', 'm01', 'm02', 'm10', 'm11', 'm12'] as const) {
      expect(t[key]).toBeCloseTo(o[key], 5)
    }
  })
})

import { describe, expect, test } from 'bun:test'

import { designDocumentToSceneGraph } from '#dom-css/import/scene-graph'
import type { DesignElement } from '#dom-css/index'

import type { Fill, SceneNode } from '@pairdraw/scene-graph'

const PNG_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function box(
  style: Record<string, string>,
  children: DesignElement['children'] = []
): DesignElement {
  return {
    type: 'element',
    tagName: 'div',
    attrs: {},
    computedStyle: { display: 'block', width: '200px', height: '100px', ...style },
    children
  }
}

function firstLayer(style: Record<string, string>): SceneNode {
  const graph = designDocumentToSceneGraph({ type: 'document', children: [box(style)] })
  const page = graph.getPages()[0]
  const node = page ? graph.getChildren(page.id)[0] : undefined
  if (!node) throw new Error('No layer imported')
  return node
}

function gradientTypes(fills: Fill[]): string[] {
  return fills.map((fill) => fill.type)
}

describe('background-image import', () => {
  test('a linear gradient becomes a gradient paint sized to the box', () => {
    const node = firstLayer({ 'background-image': 'linear-gradient(to right, red, blue)' })
    expect(gradientTypes(node.fills)).toEqual(['GRADIENT_LINEAR'])
    const fill = node.fills[0]
    if (fill?.type !== 'GRADIENT_LINEAR') throw new Error('Expected a linear gradient')
    expect(fill.gradientStops?.map((stop) => stop.position)).toEqual([0, 1])
    expect(fill.gradientTransform).toBeDefined()
  })

  test('radial and conic gradients import as their paint kinds', () => {
    expect(
      gradientTypes(firstLayer({ 'background-image': 'radial-gradient(red, blue)' }).fills)
    ).toEqual(['GRADIENT_RADIAL'])
    expect(
      gradientTypes(firstLayer({ 'background-image': 'conic-gradient(red, blue)' }).fills)
    ).toEqual(['GRADIENT_ANGULAR'])
  })

  test('CSS paints the first layer on top; fills keep the last on top', () => {
    const node = firstLayer({
      'background-color': 'rgb(0, 128, 0)',
      'background-image': 'linear-gradient(red, blue), radial-gradient(yellow, green)'
    })
    // Bottom-first: solid color, then the radial (painted under), then the linear on top.
    expect(gradientTypes(node.fills)).toEqual(['SOLID', 'GRADIENT_RADIAL', 'GRADIENT_LINEAR'])
  })

  test('a data URL layer becomes an image fill', () => {
    const node = firstLayer({ 'background-image': `url("${PNG_PIXEL}")` })
    expect(gradientTypes(node.fills)).toEqual(['IMAGE'])
    const fill = node.fills[0]
    if (fill?.type !== 'IMAGE') throw new Error('Expected an image fill')
    expect(fill.imageHash).toBeTruthy()
  })

  test('a remote url layer is skipped without failing the import', () => {
    const node = firstLayer({
      'background-image': 'url("https://example.com/bg.png"), linear-gradient(red, blue)'
    })
    expect(gradientTypes(node.fills)).toEqual(['GRADIENT_LINEAR'])
  })

  test('an invalid background-image leaves the solid color alone', () => {
    const node = firstLayer({
      'background-color': 'rgb(1, 2, 3)',
      'background-image': 'garbage('
    })
    expect(gradientTypes(node.fills)).toEqual(['SOLID'])
  })
})

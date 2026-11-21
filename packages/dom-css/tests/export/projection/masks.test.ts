import { describe, expect, test } from 'bun:test'

import {
  sceneNodeToDesignDocument,
  sceneNodesToTailwindJSX,
  type DesignElement,
  type DesignNode
} from '#dom-css/export/index'

import { SceneGraph, type MaskType } from '@pairdraw/scene-graph'

const white = {
  type: 'SOLID' as const,
  color: { r: 1, g: 1, b: 1, a: 1 },
  opacity: 1,
  visible: true
}
const red = { type: 'SOLID' as const, color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }

function element(node: DesignNode | undefined): DesignElement {
  if (node?.type !== 'element') throw new Error('Expected an element')
  return node
}

/** A frame whose first layer masks the second, with the mask at (10, 10), 50 × 50. */
function masked(maskType: MaskType) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', page, { width: 200, height: 200 })
  graph.createNode('RECTANGLE', frame.id, {
    name: 'Mask',
    x: 10,
    y: 10,
    width: 50,
    height: 50,
    isMask: true,
    maskType,
    fills: [white]
  })
  const maskedLayer = graph.createNode('RECTANGLE', frame.id, {
    name: 'Masked',
    width: 150,
    height: 150,
    fills: [red]
  })
  return { graph, frame, maskedLayer }
}

describe('shape masks projected to CSS', () => {
  test('a vector rectangle mask clips the layers after it and leaves the mask out', () => {
    const { graph, frame } = masked('VECTOR')
    const root = element(sceneNodeToDesignDocument(graph, frame.id).children[0])
    expect(root.children.map((child) => element(child).sourceSceneNode?.name)).toEqual(['Masked'])
    expect(element(root.children[0]).inlineStyle?.['clip-path']).toBe(
      'polygon(10px 10px, 60px 10px, 60px 60px, 10px 60px)'
    )
  })

  test('a rotated vector mask stays unclipped instead of clipping to its unrotated box', () => {
    const { graph, frame } = masked('VECTOR')
    const mask = graph.getChildren(frame.id).find((child) => child.isMask)
    if (!mask) throw new Error('Expected a mask')
    mask.rotation = 45
    const root = element(sceneNodeToDesignDocument(graph, frame.id).children[0])
    expect(root.children).toHaveLength(1)
    expect(element(root.children[0]).inlineStyle?.['clip-path']).toBeUndefined()
  })

  test('a mask shape is not drawn as a normal layer even when CSS cannot mask', () => {
    const { graph, frame } = masked('ALPHA')
    const root = element(sceneNodeToDesignDocument(graph, frame.id).children[0])
    expect(root.children).toHaveLength(1)
    expect(element(root.children[0]).inlineStyle?.['clip-path']).toBeUndefined()
  })

  test('a hidden mask changes nothing', () => {
    const { graph, frame } = masked('VECTOR')
    const mask = graph.getChildren(frame.id).find((child) => child.isMask)
    if (mask) mask.visible = false
    const root = element(sceneNodeToDesignDocument(graph, frame.id).children[0])
    expect(root.children).toHaveLength(1)
    expect(element(root.children[0]).inlineStyle?.['clip-path']).toBeUndefined()
  })

  test('two masks together leave the layer unmasked rather than half masked', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0].id
    const frame = graph.createNode('FRAME', page, { width: 200, height: 200 })
    graph.createNode('RECTANGLE', frame.id, {
      x: 10,
      y: 10,
      width: 50,
      height: 50,
      isMask: true,
      maskType: 'VECTOR',
      fills: [white]
    })
    graph.createNode('ELLIPSE', frame.id, {
      x: 70,
      y: 10,
      width: 50,
      height: 50,
      isMask: true,
      maskType: 'VECTOR',
      fills: [white]
    })
    graph.createNode('RECTANGLE', frame.id, { width: 150, height: 150, fills: [red] })
    const root = element(sceneNodeToDesignDocument(graph, frame.id).children[0])
    expect(root.children).toHaveLength(1)
    expect(element(root.children[0]).inlineStyle?.['clip-path']).toBeUndefined()
  })

  test('Tailwind leaves the mask out, though twirlwind cannot spell clip-path', () => {
    const { graph, frame } = masked('VECTOR')
    const jsx = sceneNodesToTailwindJSX(graph, [frame.id])
    expect(jsx).not.toContain('data-name="Mask"')
    expect(jsx).toContain('data-name="Masked"')
  })
})

import { describe, expect, test } from 'bun:test'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'
import { nodeVisualBounds, type VisualBoundsNode } from '@pairdraw/scene-graph/geometry'

const at = () => ({ x: 10, y: 20 })

function text(props: Partial<VisualBoundsNode>): VisualBoundsNode {
  return { id: 'text', type: 'TEXT', visible: true, width: 110, height: 40, ...props }
}

// Figma 126 draws a fixed-size text's lines past its box.
describe('text lines past a fixed-size box', () => {
  test('reach the visual bounds', () => {
    expect(nodeVisualBounds(text({ derivedTextHeight: 154 }), at)).toEqual({
      minX: 10,
      minY: 20,
      maxX: 120,
      maxY: 174
    })
  })

  test('turn with the text', () => {
    const bounds = nodeVisualBounds(text({ derivedTextHeight: 154, rotation: 90 }), at)
    expect(bounds.maxX - bounds.minX).toBeCloseTo(154)
    expect(bounds.maxY - bounds.minY).toBeCloseTo(110)
  })

  test('within the box leave it as it is', () => {
    expect(nodeVisualBounds(text({ derivedTextHeight: 30 }), at).maxY).toBe(60)
  })
})

describe('text decoration past a turned box', () => {
  test('reaches out along the turn, not below the canvas box', () => {
    const turned = text({
      width: 100,
      height: 40,
      rotation: 90,
      fontSize: 20,
      textDecoration: 'UNDERLINE'
    })
    const bounds = nodeVisualBounds(turned, () => ({ x: 0, y: 0 }))
    // 3.6 offset + 1.25 thickness + 7 descent below the box, turned with it about the origin.
    expect(bounds.maxY).toBeCloseTo(100)
    expect(bounds.minY).toBeCloseTo(0)
    expect(bounds.maxX - bounds.minX).toBeCloseTo(51.85)
  })
})

// Callers pass `graph.getAbsolutePosition`, the layer's turned origin, not its unturned top-left.
describe('visual bounds from the graph position', () => {
  function turnedRect(props: Partial<SceneNode>) {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const node = graph.createNode('RECTANGLE', page.id, {
      x: 100,
      y: 100,
      width: 100,
      height: 50,
      ...props
    })
    return { graph, node }
  }

  test('a rotated layer matches its drawn box', () => {
    const { graph, node } = turnedRect({ rotation: 45 })
    const bounds = nodeVisualBounds(node, (id) => graph.getAbsolutePosition(id))
    expect(bounds.minX).toBeCloseTo(96.97)
    expect(bounds.minY).toBeCloseTo(71.97)
    const drawn = getAxisAlignedWorldBounds(node, graph)
    expect(bounds.maxX).toBeCloseTo(drawn.x + drawn.width)
    expect(bounds.maxY).toBeCloseTo(drawn.y + drawn.height)
  })
})

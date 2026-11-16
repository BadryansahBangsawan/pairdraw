import { describe, expect, test } from 'bun:test'

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
    // 3.6 offset + 1.25 thickness + 7 descent below the box, turned with it.
    expect(bounds.maxY).toBeCloseTo(70)
    expect(bounds.minY).toBeCloseTo(-30)
    expect(bounds.maxX - bounds.minX).toBeCloseTo(51.85)
  })
})

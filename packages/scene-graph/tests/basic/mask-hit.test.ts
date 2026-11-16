import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import { pageId, rect } from './helpers'

describe('hitTest with a mask', () => {
  function masked() {
    const graph = new SceneGraph()
    const below = rect(graph, 'Below', 150, 150, 100, 100)
    const mask = graph.createNode('RECTANGLE', pageId(graph), {
      name: 'Mask',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      isMask: true
    })
    const content = rect(graph, 'Content', 0, 0, 200, 200)
    return { graph, below, mask, content }
  }

  test('hits a masked layer inside the mask', () => {
    const { graph, content } = masked()
    expect(graph.hitTest(25, 25, pageId(graph))?.id).toBe(content)
  })

  test('misses a masked layer where the mask cuts it away', () => {
    const { graph } = masked()
    expect(graph.hitTest(100, 100, pageId(graph))).toBeNull()
  })

  test('still hits a layer below the mask', () => {
    const { graph, below } = masked()
    expect(graph.hitTest(175, 175, pageId(graph))?.id).toBe(below)
  })

  test('a hidden mask clips nothing', () => {
    const { graph, mask, content } = masked()
    graph.updateNode(mask.id, { visible: false })
    expect(graph.hitTest(100, 100, pageId(graph))?.id).toBe(content)
  })
})

describe('hitTest of a zero-size layer', () => {
  test('hits a zero-width layer next to its line', () => {
    const graph = new SceneGraph()
    const id = rect(graph, 'Vertical', 10, 10, 0, 50)
    expect(graph.hitTest(12, 30, pageId(graph))?.id).toBe(id)
    expect(graph.hitTest(30, 30, pageId(graph))).toBeNull()
  })

  test('hits a zero-height layer next to its line', () => {
    const graph = new SceneGraph()
    const id = rect(graph, 'Horizontal', 10, 10, 50, 0)
    expect(graph.hitTest(30, 8, pageId(graph))?.id).toBe(id)
  })
})

/** A triangle as the command blob a layer's fill geometry holds: move, two lines, close. */
function triangleBlob(w: number, h: number): Uint8Array {
  const values = [1, 0, 0, 2, w, 0, 2, 0, h, 0]
  const bytes = new Uint8Array(1 + 8 + (1 + 8) * 2 + 1)
  const view = new DataView(bytes.buffer)
  let offset = 0
  for (let index = 0; index < values.length; index += 3) {
    bytes[offset++] = values[index]
    if (values[index] === 0) break
    view.setFloat32(offset, values[index + 1], true)
    view.setFloat32(offset + 4, values[index + 2], true)
    offset += 8
  }
  return bytes
}

// A mask cuts by the outline it draws, so a click inside its box but outside the shape passes
// through the layers it masks.
describe('hitTest with a mask shapes the click', () => {
  function maskedBy(
    type: 'ELLIPSE' | 'RECTANGLE' | 'VECTOR',
    width: number,
    height: number,
    overrides: Parameters<SceneGraph['createNode']>[2] = {}
  ) {
    const graph = new SceneGraph()
    const mask = graph.createNode(type, pageId(graph), {
      name: 'Mask',
      x: 0,
      y: 0,
      width,
      height,
      isMask: true,
      ...overrides
    })
    const content = rect(graph, 'Content', 0, 0, 200, 200)
    return { graph, mask, content }
  }

  test('an ellipse mask cuts by its curve', () => {
    const { graph, content } = maskedBy('ELLIPSE', 200, 100)
    expect(graph.hitTest(100, 50, pageId(graph))?.id).toBe(content)
    // Inside the ellipse's box, outside the ellipse itself.
    expect(graph.hitTest(5, 5, pageId(graph))?.id).not.toBe(content)
  })

  test('a rounded mask cuts by its corners', () => {
    const { graph, content } = maskedBy('RECTANGLE', 200, 200, { cornerRadius: 50 })
    expect(graph.hitTest(100, 2, pageId(graph))?.id).toBe(content)
    expect(graph.hitTest(2, 2, pageId(graph))?.id).not.toBe(content)
  })

  test('a vector mask cuts by its outline', () => {
    const { graph, content } = maskedBy('VECTOR', 200, 200, {
      fillGeometry: [{ commandsBlob: triangleBlob(200, 200) }]
    })
    expect(graph.hitTest(20, 20, pageId(graph))?.id).toBe(content)
    // Inside the triangle's box, outside the triangle.
    expect(graph.hitTest(150, 150, pageId(graph))?.id).not.toBe(content)
  })
})

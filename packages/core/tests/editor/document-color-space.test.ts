import { describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core/editor'
import { SceneGraph, type Fill } from '@pairdraw/scene-graph'

const RED = { r: 1, g: 0, b: 0, a: 1 }

/** Red in Display-P3, the colour an sRGB red becomes when the document converts. */
const P3_RED = { r: 0.91749, g: 0.20029, b: 0.13856 }

function meshFill(): Fill {
  return {
    type: 'MESH',
    color: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
    opacity: 1,
    visible: true,
    meshColumns: 1,
    meshRows: 1,
    meshPoints: [
      { position: { x: 0, y: 0 }, color: { ...RED } },
      { position: { x: 1, y: 0 }, color: { ...RED } },
      { position: { x: 0, y: 1 }, color: { ...RED } },
      { position: { x: 1, y: 1 }, color: { ...RED } }
    ]
  }
}

function expectDisplayP3(color: { r: number; g: number; b: number }) {
  expect(color.r).toBeCloseTo(P3_RED.r, 4)
  expect(color.g).toBeCloseTo(P3_RED.g, 4)
  expect(color.b).toBeCloseTo(P3_RED.b, 4)
}

describe('document colour space conversion', () => {
  test('converts the colours of a mesh gradient, not only its base colour', () => {
    const graph = new SceneGraph()
    const editor = createEditor({ graph })
    const page = graph.getPages()[0]
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 40,
      height: 40,
      fills: [meshFill()]
    })

    editor.setDocumentColorSpace('display-p3', 'convert')

    const fill = graph.getNode(node.id)?.fills[0]
    for (const point of fill?.meshPoints ?? []) expectDisplayP3(point.color)
  })

  test('converts a gradient stroke, not only its base colour', () => {
    const graph = new SceneGraph()
    const editor = createEditor({ graph })
    const page = graph.getPages()[0]
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 40,
      height: 40,
      strokes: [
        {
          type: 'GRADIENT_LINEAR',
          color: RED,
          opacity: 1,
          visible: true,
          weight: 2,
          align: 'INSIDE',
          gradientStops: [{ position: 0, color: { ...RED } }],
          gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
        }
      ]
    })

    editor.setDocumentColorSpace('display-p3', 'convert')

    const stroke = expectDefined(graph.getNode(node.id)?.strokes[0], 'stroke')
    expectDisplayP3(expectDefined(stroke.gradientStops?.[0]?.color, 'stroke stop colour'))
  })

  test('converts a gradient fill on a text style run', () => {
    const graph = new SceneGraph()
    const editor = createEditor({ graph })
    const page = graph.getPages()[0]
    const gradient: Fill = {
      type: 'GRADIENT_LINEAR',
      color: RED,
      opacity: 1,
      visible: true,
      gradientStops: [{ position: 0, color: { ...RED } }],
      gradientTransform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 }
    }
    const node = graph.createNode('TEXT', page.id, {
      text: 'A',
      styleRuns: [{ start: 0, length: 1, style: { fills: [gradient] } }]
    })

    editor.setDocumentColorSpace('display-p3', 'convert')

    const run = graph.getNode(node.id)?.styleRuns?.[0]
    expectDisplayP3(run?.style.fills?.[0]?.gradientStops?.[0]?.color ?? RED)
  })
})

test('converts the base colour of paints that fall back to it', () => {
  for (const type of ['MESH', 'PATTERN', 'NOISE', 'CUSTOM'] as const) {
    const graph = new SceneGraph()
    const editor = createEditor({ graph })
    const page = graph.getPages()[0]
    const node = graph.createNode('RECTANGLE', page.id, {
      width: 10,
      height: 10,
      fills: [{ type, color: { ...RED }, opacity: 1, visible: true } as Fill]
    })

    editor.setDocumentColorSpace('display-p3', 'convert')

    const color = expectDefined(graph.getNode(node.id)).fills[0]?.color
    expectDisplayP3(expectDefined(color))
  }
})

test('converting back to sRGB restores the colours', () => {
  const graph = new SceneGraph()
  const editor = createEditor({ graph })
  const page = graph.getPages()[0]
  const node = graph.createNode('RECTANGLE', page.id, {
    width: 10,
    height: 10,
    fills: [meshFill(), { type: 'SOLID', color: { ...RED }, opacity: 1, visible: true }]
  })

  editor.setDocumentColorSpace('display-p3', 'convert')
  editor.setDocumentColorSpace('srgb', 'convert')

  const fills = expectDefined(graph.getNode(node.id)).fills
  expect(fills[0]?.meshPoints?.[0]?.color.r).toBeCloseTo(1, 2)
  expect(fills[0]?.meshPoints?.[0]?.color.g).toBeCloseTo(0, 2)
  expect(fills[1]?.color.r).toBeCloseTo(1, 2)
  expect(fills[1]?.color.g).toBeCloseTo(0, 2)
  expect(fills[1]?.color.b).toBeCloseTo(0, 2)
})

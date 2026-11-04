import { describe, expect, test } from 'bun:test'

import type { PenNode } from '@open-pencil/pen'
import { gradientPoint } from '@open-pencil/scene-graph/gradient'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'

function gradientOf(fill: PenNode['fill']) {
  const paint = expectDefined(fillsOf(fill)[0], 'gradient')
  return { paint, transform: expectDefined(paint.gradientTransform, 'gradient transform') }
}

function fillsOf(fill: PenNode['fill']) {
  return getNodeOrThrow(
    parseDocument([{ id: 'shape', type: 'rectangle', width: 200, height: 100, fill }]),
    'shape'
  ).fills
}

const stops = [
  { color: '#000000', position: 0 },
  { color: '#FFFFFF', position: 1 }
]

function expectPoint(actual: Vector, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x, 6)
  expect(actual.y).toBeCloseTo(y, 6)
}

describe('parsePenFile — fills', () => {
  test('keeps a hex alpha as the fill opacity', () => {
    expect(fillsOf('#FF000080')[0]).toMatchObject({ type: 'SOLID', opacity: 128 / 255 })
  })

  test('hides a disabled paint and keeps its blend mode', () => {
    const [base, top] = fillsOf([
      '#FFFF00',
      { type: 'color', color: '#00FFFF', blendMode: 'multiply', enabled: false }
    ])
    expect(expectDefined(base).visible).toBe(true)
    expect(top).toMatchObject({ visible: false, blendMode: 'MULTIPLY' })
  })

  // Measured on pen.dev 2.21: gradients live in the layer's unit square, rotation turns them
  // counter-clockwise, and an unrotated linear gradient runs from bottom to top.
  test('places an unrotated linear gradient from bottom to top', () => {
    const { paint: fill, transform } = gradientOf({
      type: 'gradient',
      gradientType: 'linear',
      colors: stops
    })
    expect(fill.type).toBe('GRADIENT_LINEAR')
    expect(fill.gradientStops?.map((stop) => stop.position)).toEqual([0, 1])
    expectPoint(gradientPoint(transform, { x: 0, y: 0.5 }), 0.5, 1)
    expectPoint(gradientPoint(transform, { x: 1, y: 0.5 }), 0.5, 0)
  })

  test('turns, moves and shortens a linear gradient in the unit square', () => {
    const { paint: fill, transform } = gradientOf({
      type: 'gradient',
      gradientType: 'linear',
      rotation: 90,
      center: { x: 0.3, y: 0.6 },
      size: { height: 0.5 },
      opacity: 0.7,
      colors: stops
    })
    expect(fill.opacity).toBe(0.7)
    expectPoint(gradientPoint(transform, { x: 0, y: 0.5 }), 0.55, 0.6)
    expectPoint(gradientPoint(transform, { x: 1, y: 0.5 }), 0.05, 0.6)
  })

  test('sizes a radial gradient by its diameters', () => {
    const { paint: fill, transform } = gradientOf({
      type: 'gradient',
      gradientType: 'radial',
      center: { x: 0.3, y: 0.6 },
      size: { width: 0.6, height: 0.8 },
      colors: stops
    })
    expect(fill.type).toBe('GRADIENT_RADIAL')
    expectPoint(gradientPoint(transform, { x: 0.5, y: 0.5 }), 0.3, 0.6)
    expectPoint(gradientPoint(transform, { x: 1, y: 0.5 }), 0.6, 0.6)
    expectPoint(gradientPoint(transform, { x: 0.5, y: 1 }), 0.3, 1)
  })

  test('sizes a diamond gradient by its diameters, as a radial one', () => {
    const { paint: fill, transform } = gradientOf({
      type: 'gradient',
      gradientType: 'diamond',
      center: { x: 0.3, y: 0.6 },
      size: { width: 0.6, height: 0.8 },
      colors: stops
    })
    expect(fill.type).toBe('GRADIENT_DIAMOND')
    expectPoint(gradientPoint(transform, { x: 0.5, y: 0.5 }), 0.3, 0.6)
    expectPoint(gradientPoint(transform, { x: 1, y: 0.5 }), 0.6, 0.6)
    expectPoint(gradientPoint(transform, { x: 0.5, y: 1 }), 0.3, 1)
  })

  test('starts an angular gradient at the top, turned counter-clockwise', () => {
    const { paint: fill, transform } = gradientOf({
      type: 'gradient',
      gradientType: 'angular',
      rotation: 90,
      colors: stops
    })
    expect(fill.type).toBe('GRADIENT_ANGULAR')
    // The scene graph starts angular gradients at +x of gradient space and turns clockwise.
    expectPoint(gradientPoint(transform, { x: 1, y: 0.5 }), 0, 0.5)
    expectPoint(gradientPoint(transform, { x: 0.5, y: 1 }), 0.5, 0)
  })

  test('skips paints it cannot draw instead of painting them black', () => {
    expect(fillsOf([{ type: 'mesh_gradient', columns: 2 }, '#FF0000'])).toHaveLength(1)
  })

  test('reads a mesh_gradient as a mesh fill', () => {
    const [fill] = fillsOf({
      type: 'mesh_gradient',
      columns: 2,
      rows: 2,
      colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
      points: [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1]
      ]
    })
    expect(fill?.type).toBe('MESH')
    expect(fill).toMatchObject({ meshColumns: 1, meshRows: 1 })
    expect(fill?.meshPoints?.map((point) => point.position)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 }
    ])
    expect(fill?.meshPoints?.[0]?.color).toMatchObject({ r: 1, g: 0, b: 0 })
  })

  test('reads bezier-handle points by their positions', () => {
    const [fill] = fillsOf({
      type: 'mesh_gradient',
      columns: 2,
      rows: 2,
      colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
      points: [
        { position: [0, 0], leftHandle: [-0.1, 0] },
        { position: [1, 0], rightHandle: [0.1, 0] },
        { position: [0, 1], topHandle: [0, -0.1] },
        { position: [1, 1], bottomHandle: [0, 0.1] }
      ]
    })
    expect(fill?.type).toBe('MESH')
    expect(fill).toMatchObject({ meshColumns: 1, meshRows: 1 })
    expect(fill?.meshPoints?.[1]?.position).toEqual({ x: 1, y: 0 })
  })

  test('skips a mesh_gradient whose columns is not a number', () => {
    // The paint passes document validation through otherPaintSchema, which only requires a
    // string type. Casting it to PenMeshPaint let `Number(true)` stand in for the column count
    // and the layer still drew a mesh; the schema check rejects the paint instead.
    expect(
      fillsOf({
        type: 'mesh_gradient',
        columns: true,
        rows: true,
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
        points: [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1]
        ]
      })
    ).toEqual([])
  })
})

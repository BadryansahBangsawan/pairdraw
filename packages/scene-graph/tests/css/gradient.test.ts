import { describe, expect, test } from 'bun:test'

import type { Fill, GradientStop } from '@pairdraw/scene-graph'
import { parseCSSBackgroundImages, type CSSBackgroundLayer } from '@pairdraw/scene-graph/css'
import { applyGradientTransform, gradientPoint } from '@pairdraw/scene-graph/gradient'
import type { Color } from '@pairdraw/scene-graph/primitives'

const RED: Color = { r: 1, g: 0, b: 0, a: 1 }
const BLUE: Color = { r: 0, g: 0, b: 1, a: 1 }
const TRANSPARENT: Color = { r: 0, g: 0, b: 0, a: 0 }

function stops(...entries: [Color, number][]): GradientStop[] {
  return entries.map(([color, position]) => ({ color, position }))
}

/** The paint of a gradient layer; image layers and non-gradients fail the test. */
function gradient(layer: CSSBackgroundLayer | undefined): Fill {
  if (layer?.kind !== 'gradient') throw new Error(`Expected a gradient layer, got ${layer?.kind}`)
  const fill = layer.fill
  if (fill.type === 'SOLID' || fill.type === 'IMAGE' || fill.type === 'MESH') {
    throw new Error(`Expected a gradient, got ${fill.type}`)
  }
  return fill
}

/** Where a gradient-space point lands in the layer's unit square. */
function pointAt(layer: CSSBackgroundLayer | undefined, x: number, y: number) {
  const t = gradient(layer).gradientTransform
  if (!t) throw new Error('Gradient without a transform')
  return gradientPoint(t, { x, y })
}

describe('parseCSSBackgroundImages', () => {
  test('reads nothing from none, empty, or invalid values', () => {
    expect(parseCSSBackgroundImages(undefined, 100, 100)).toEqual([])
    expect(parseCSSBackgroundImages('none', 100, 100)).toEqual([])
    expect(parseCSSBackgroundImages('linear-gradient(red)', 100, 100)).toEqual([])
    expect(parseCSSBackgroundImages('not-a-gradient(red, blue)', 100, 100)).toEqual([])
  })

  test('a default linear gradient runs top to bottom with even stops', () => {
    const [fill] = parseCSSBackgroundImages('linear-gradient(red, blue)', 100, 200)
    expect(gradient(fill)).toMatchObject({
      type: 'GRADIENT_LINEAR',
      gradientStops: stops([RED, 0], [BLUE, 1]),
      visible: true
    })
    expect(pointAt(fill, 0, 0.5).y).toBeCloseTo(0)
    expect(pointAt(fill, 1, 0.5).y).toBeCloseTo(1)
    expect(pointAt(fill, 0.5, 0.5).x).toBeCloseTo(0.5)
  })

  test('to right runs left to right', () => {
    const [fill] = parseCSSBackgroundImages('linear-gradient(to right, red, blue)', 200, 100)
    expect(pointAt(fill, 0, 0.5).x).toBeCloseTo(0)
    expect(pointAt(fill, 1, 0.5).x).toBeCloseTo(1)
    expect(pointAt(fill, 0.5, 0).y).toBeCloseTo(0)
  })

  test('90deg points right and 0deg points up, clockwise', () => {
    const [right] = parseCSSBackgroundImages('linear-gradient(90deg, red, blue)', 100, 100)
    expect(pointAt(right, 0, 0.5).x).toBeCloseTo(0)
    expect(pointAt(right, 1, 0.5).x).toBeCloseTo(1)
    const [up] = parseCSSBackgroundImages('linear-gradient(0deg, red, blue)', 100, 100)
    expect(pointAt(up, 0, 0.5).y).toBeCloseTo(1)
    expect(pointAt(up, 1, 0.5).y).toBeCloseTo(0)
  })

  test('the gradient line spans the box per the CSS spec', () => {
    // 45deg on a 200x100 box: line length |w sin| + |h cos| = (200+100)/sqrt(2).
    const [fill] = parseCSSBackgroundImages('linear-gradient(45deg, red, blue)', 200, 100)
    const start = pointAt(fill, 0, 0.5)
    const end = pointAt(fill, 1, 0.5)
    expect(start.x).toBeCloseTo(0.125)
    expect(start.y).toBeCloseTo(1.25)
    expect(end.x).toBeCloseTo(0.875)
    expect(end.y).toBeCloseTo(-0.25)
  })

  test('to top right aims at the corner with the spec line length', () => {
    const [fill] = parseCSSBackgroundImages('linear-gradient(to top right, red, blue)', 200, 100)
    const end = pointAt(fill, 1, 0.5)
    // The line ends past the corner along the same direction; the perpendicular through the
    // end passes the top-right corner (1, 0).
    const start = pointAt(fill, 0, 0.5)
    const dir = { x: end.x - start.x, y: end.y - start.y }
    const toCorner = { x: 1 - end.x, y: 0 - end.y }
    expect(dir.x * toCorner.x + dir.y * toCorner.y).toBeCloseTo(0)
    expect(dir.x).toBeGreaterThan(0)
    expect(dir.y).toBeLessThan(0)
  })

  test('reads stop positions, rgba, hsl, and hex colors', () => {
    const [fill] = parseCSSBackgroundImages(
      'linear-gradient(to right, rgba(255, 0, 0, 0.5) 20%, hsl(240, 100%, 50%) 80%)',
      100,
      100
    )
    expect(gradient(fill).gradientStops).toEqual([
      { color: { r: 1, g: 0, b: 0, a: 0.5 }, position: 0.2 },
      { color: BLUE, position: 0.8 }
    ])
    const [hex] = parseCSSBackgroundImages('linear-gradient(#ff0000, #00f)', 100, 100)
    expect(gradient(hex).gradientStops).toEqual(stops([RED, 0], [BLUE, 1]))
  })

  test('fills missing stop positions evenly between their neighbors', () => {
    const [fill] = parseCSSBackgroundImages(
      'linear-gradient(red 0%, yellow, green, blue 100%)',
      100,
      100
    )
    const positions = gradient(fill).gradientStops?.map((stop) => stop.position)
    expect(positions?.[0]).toBeCloseTo(0)
    expect(positions?.[1]).toBeCloseTo(1 / 3)
    expect(positions?.[2]).toBeCloseTo(2 / 3)
    expect(positions?.[3]).toBeCloseTo(1)
  })

  test('keeps transparent stops', () => {
    const [fill] = parseCSSBackgroundImages('linear-gradient(transparent, red)', 100, 100)
    expect(gradient(fill).gradientStops?.[0]).toEqual({ color: TRANSPARENT, position: 0 })
  })

  test('a radial gradient defaults to a farthest-corner ellipse at the center', () => {
    const [fill] = parseCSSBackgroundImages('radial-gradient(red, blue)', 200, 100)
    expect(gradient(fill).type).toBe('GRADIENT_RADIAL')
    const center = pointAt(fill, 0.5, 0.5)
    expect(center.x).toBeCloseTo(0.5)
    expect(center.y).toBeCloseTo(0.5)
    // Farthest corner from the center of a 200x100 box: rx = 100*sqrt(2), ry = 50*sqrt(2).
    const edgeX = pointAt(fill, 1, 0.5)
    const edgeY = pointAt(fill, 0.5, 1)
    expect((edgeX.x - 0.5) * 200).toBeCloseTo(100 * Math.SQRT2)
    expect((edgeY.y - 0.5) * 100).toBeCloseTo(50 * Math.SQRT2)
  })

  test('a circle with an explicit radius and position', () => {
    const [fill] = parseCSSBackgroundImages(
      'radial-gradient(circle 50px at 25% 75%, red, blue)',
      200,
      100
    )
    const center = pointAt(fill, 0.5, 0.5)
    expect(center.x).toBeCloseTo(0.25)
    expect(center.y).toBeCloseTo(0.75)
    const edgeX = pointAt(fill, 1, 0.5)
    const edgeY = pointAt(fill, 0.5, 1)
    expect((edgeX.x - center.x) * 200).toBeCloseTo(50)
    expect((edgeY.y - center.y) * 100).toBeCloseTo(50)
  })

  test('closest-side sizes the ellipse to the nearest edges', () => {
    const [fill] = parseCSSBackgroundImages(
      'radial-gradient(ellipse closest-side at 25% 50%, red, blue)',
      200,
      100
    )
    const center = pointAt(fill, 0.5, 0.5)
    const edgeX = pointAt(fill, 1, 0.5)
    const edgeY = pointAt(fill, 0.5, 1)
    expect((edgeX.x - center.x) * 200).toBeCloseTo(50)
    expect((edgeY.y - center.y) * 100).toBeCloseTo(50)
  })

  test('a conic gradient starts up and turns clockwise', () => {
    const [fill] = parseCSSBackgroundImages('conic-gradient(red, blue)', 100, 100)
    expect(gradient(fill).type).toBe('GRADIENT_ANGULAR')
    // Gradient-space +x is the start ray: CSS 0deg points up.
    const start = pointAt(fill, 1, 0.5)
    expect(start.x).toBeCloseTo(0.5)
    expect(start.y).toBeLessThan(0.5)
    // A quarter turn clockwise lands right.
    const quarter = applyGradientTransform(
      { m00: 0, m01: -1, m02: 1, m10: 1, m11: 0, m12: 0 },
      { x: 1, y: 0.5 }
    )
    const quarterPoint = pointAt(fill, quarter.x, quarter.y)
    expect(quarterPoint.x).toBeGreaterThan(0.5)
    expect(quarterPoint.y).toBeCloseTo(0.5)
  })

  test('conic from 90deg starts right', () => {
    const [fill] = parseCSSBackgroundImages('conic-gradient(from 90deg at 50% 50%, red, blue)', 100, 100)
    const start = pointAt(fill, 1, 0.5)
    expect(start.x).toBeGreaterThan(0.5)
    expect(start.y).toBeCloseTo(0.5)
  })

  test('a conic gradient on a wide layer keeps its sweep round', () => {
    const [fill] = parseCSSBackgroundImages(
      'conic-gradient(from 45deg at 50% 50%, red, blue)',
      200,
      100
    )
    expect(gradient(fill).type).toBe('GRADIENT_ANGULAR')
    // A 45deg ray runs up-right at 45deg on screen, so it travels the same distance each way.
    const start = pointAt(fill, 1, 0.5)
    expect((start.x - 0.5) * 200).toBeCloseTo(-(start.y - 0.5) * 100)
    expect(start.y).toBeLessThan(0.5)
    expect(start.x).toBeGreaterThan(0.5)
  })

  test('pixel stops resolve against the gradient line', () => {
    const positions = (value: string) =>
      gradient(parseCSSBackgroundImages(value, 200, 100)[0]).gradientStops?.map((s) => s.position)
    // 0deg points up in a 200x100 box, so the line is 100 long and 20px is a fifth of it.
    expect(positions('linear-gradient(red 20px, blue)')?.[0]).toBeCloseTo(0.2)
    // 90deg points right, so the line is 200 long and 20px is a tenth of it.
    expect(positions('linear-gradient(90deg, red 20px, blue)')?.[0]).toBeCloseTo(0.1)
    // Percentages keep their meaning: they are already fractions of the same line.
    expect(positions('linear-gradient(90deg, red 20%, blue)')?.[0]).toBeCloseTo(0.2)
    expect(positions('linear-gradient(90deg, red 20px, blue)')?.at(-1)).toBeCloseTo(1)
  })

  test('pixel stops resolve against a radial gradient radius', () => {
    const [fill] = parseCSSBackgroundImages(
      'radial-gradient(circle 100px at 50% 50%, red 25px, blue)',
      200,
      200
    )
    expect(gradient(fill).gradientStops).toEqual(stops([RED, 0.25], [BLUE, 1]))
  })

  test('keeps layers in CSS paint order, first on top', () => {
    const layers = parseCSSBackgroundImages(
      'linear-gradient(red, blue), radial-gradient(green, yellow)',
      100,
      100
    )
    expect(layers.map((layer) => gradient(layer).type)).toEqual([
      'GRADIENT_LINEAR',
      'GRADIENT_RADIAL'
    ])
  })

  test('url layers come back as image sources', () => {
    const layers = parseCSSBackgroundImages(
      'url("data:image/png;base64,AAAA"), linear-gradient(red, blue)',
      100,
      100
    )
    expect(layers[0]).toEqual({ kind: 'image', url: 'data:image/png;base64,AAAA' })
    expect(gradient(layers[1]).type).toBe('GRADIENT_LINEAR')
  })
})
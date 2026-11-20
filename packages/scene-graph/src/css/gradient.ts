import valueParser, { type FunctionNode, type Node } from 'postcss-value-parser'

import { parseDisplayableColor } from '../color'
import { TRANSPARENT } from '../constants'
import { ellipticalGradientTransform, linearGradientTransform } from '../gradient'
import type { Color, Vector } from '../primitives'
import type { Fill, GradientStop } from '../types'
import { cssDimension, cssLayers } from './values'

/**
 * One `background-image` layer as CSS paints it: a gradient paint, or an image address the
 * importer fetches. Layers stay in CSS order, the first painted on top.
 */
export type CSSBackgroundLayer = { kind: 'gradient'; fill: Fill } | { kind: 'image'; url: string }

/** The gradient's argument layers; an empty layer paints nothing, so it is dropped. */
function layersOf(nodes: Node[]): Node[][] {
  return cssLayers(nodes).filter((layer) => layer.length > 0)
}

/** A CSS angle in degrees, or null for anything else. Unitless zero is allowed. */
function angleOf(node: Node | undefined): number | null {
  const dimension = cssDimension(node)
  if (!dimension) return null
  const { value, unit } = dimension
  switch (unit) {
    case 'deg':
      return value
    case 'grad':
      return value * 0.9
    case 'rad':
      return (value * 180) / Math.PI
    case 'turn':
      return value * 360
    case '':
      return value === 0 ? 0 : null
    default:
      return null
  }
}

/** A length in pixels or a percentage of `basis`; null for anything else. */
function lengthOf(node: Node | undefined, basis: number): number | null {
  const dimension = cssDimension(node)
  if (!dimension) return null
  const { value, unit } = dimension
  switch (unit) {
    case 'px':
      return value
    case '%':
      return (value / 100) * basis
    case '':
      return value === 0 ? 0 : null
    default:
      return null
  }
}

const SIDE_ANGLES: Record<string, number> = { top: 0, right: 90, bottom: 180, left: 270 }

/**
 * The direction of a linear gradient in degrees, CSS convention: 0 points up, clockwise.
 * `to <corner>` aims at that corner; the line length then follows from the angle.
 */
function directionOf(nodes: Node[], width: number, height: number): number | null {
  const first = nodes[0]
  if (first.type === 'word' && first.value.toLowerCase() === 'to') {
    const sides = nodes
      .slice(1)
      .map((node) => (node.type === 'word' ? node.value.toLowerCase() : ''))
    if (sides.length === 1 && Object.hasOwn(SIDE_ANGLES, sides[0])) {
      return SIDE_ANGLES[sides[0]]
    }
    if (sides.length === 2) {
      const vertical = sides.find((side) => side === 'top' || side === 'bottom')
      const horizontal = sides.find((side) => side === 'left' || side === 'right')
      if (vertical && horizontal && width > 0 && height > 0) {
        const corner = (Math.atan2(width, height) * 180) / Math.PI
        if (vertical === 'top') return horizontal === 'right' ? corner : 360 - corner
        return horizontal === 'right' ? 180 - corner : 180 + corner
      }
    }
    return null
  }
  return angleOf(first)
}

/**
 * A stop's color and its optional one or two positions, as fractions of the gradient line.
 * A pixel position resolves against `pixelBasis`, the line's length in pixels; a gradient that
 * has none (a conic sweep) rejects pixel positions.
 */
interface StopDraft {
  color: Color
  positions: number[]
}

function stopFraction(node: Node, pixelBasis: number | null): number | null {
  const dimension = cssDimension(node)
  if (!dimension) return null
  const { value, unit } = dimension
  switch (unit) {
    case 'px':
      return pixelBasis === null || pixelBasis <= 0 ? null : value / pixelBasis
    case '%':
      return value / 100
    case '':
      return value === 0 ? 0 : null
    default:
      return null
  }
}

function stopsOf(args: Node[][], pixelBasis: number | null): GradientStop[] | null {
  const drafts: StopDraft[] = []
  for (const arg of args) {
    const color = parseDisplayableColor(valueParser.stringify(arg[0]))
    if (!color) return null
    const positions: number[] = []
    for (const node of arg.slice(1)) {
      const fraction = stopFraction(node, pixelBasis)
      if (fraction === null) return null
      positions.push(fraction)
    }
    if (positions.length > 2) return null
    drafts.push({ color, positions })
  }
  if (drafts.length < 2) return null

  // Missing positions spread evenly between the nearest positioned neighbors; a first stop
  // without one sits at 0 and a last at 1. Positions never move backwards.
  const resolved: (number | null)[] = drafts.map((draft) => draft.positions[0] ?? null)
  resolved[0] ??= 0
  resolved[resolved.length - 1] ??= 1
  let anchor = 0
  for (let index = 1; index < resolved.length - 1; index++) {
    if (resolved[index] !== null) {
      anchor = index
      continue
    }
    let next = index + 1
    while (resolved[next] === null) next++
    const from = resolved[anchor] ?? 0
    const to = resolved[next] ?? 1
    resolved[index] = from + ((to - from) * (index - anchor)) / (next - anchor)
  }
  let previous = 0
  const stops: GradientStop[] = []
  drafts.forEach((draft, index) => {
    const position = Math.max(resolved[index] ?? 0, previous)
    previous = position
    stops.push({ color: draft.color, position })
    if (draft.positions.length === 2) {
      previous = Math.max(draft.positions[1] ?? position, position)
      stops.push({ color: draft.color, position: previous })
    }
  })
  return stops
}

const POSITION_KEYWORDS: Record<string, Partial<Vector>> = {
  left: { x: 0 },
  right: { x: 1 },
  top: { y: 0 },
  bottom: { y: 1 },
  center: {}
}

/** The unit-square point of a CSS position pair such as `25% 75%` or `left top`. */
function positionOf(nodes: Node[], width: number, height: number): Vector | null {
  const point: Vector = { x: 0.5, y: 0.5 }
  if (nodes.length === 0) return point
  let axis = 0
  for (const node of nodes) {
    if (node.type === 'word' && node.value.toLowerCase() in POSITION_KEYWORDS) {
      Object.assign(point, POSITION_KEYWORDS[node.value.toLowerCase()])
      axis++
      continue
    }
    const fraction = lengthOf(node, axis === 0 ? width : height)
    if (fraction === null) return null
    if (axis === 0) point.x = width > 0 ? fraction / width : 0.5
    else point.y = height > 0 ? fraction / height : 0.5
    axis++
  }
  return axis > 0 && axis <= 2 ? point : null
}

function linearGradient(fn: FunctionNode, width: number, height: number): Fill | null {
  const args = layersOf(fn.nodes)
  if (args.length === 0) return null
  let stopArgs = args
  let degrees = 180
  const head = args[0] ?? []
  const first = head[0]
  const isDirection =
    first.type === 'word' && (first.value.toLowerCase() === 'to' || angleOf(first) !== null)
  if (isDirection) {
    const direction = directionOf(head, width, height)
    if (direction === null) return null
    degrees = direction
    stopArgs = args.slice(1)
  }
  // CSS gradient line: through the center, length |w sin a| + |h cos a|, so the bands at 0
  // and 1 pass the box corners. Screen y grows downward; 0deg points up.
  const radians = (degrees * Math.PI) / 180
  const dir = { x: Math.sin(radians), y: -Math.cos(radians) }
  const lineLength = Math.abs(width * dir.x) + Math.abs(height * dir.y)
  const stops = stopsOf(stopArgs, lineLength)
  if (!stops || width <= 0 || height <= 0) return null

  const half = lineLength / 2
  const start = { x: 0.5 - (dir.x * half) / width, y: 0.5 - (dir.y * half) / height }
  const end = { x: 0.5 + (dir.x * half) / width, y: 0.5 + (dir.y * half) / height }
  return {
    type: 'GRADIENT_LINEAR',
    color: { ...TRANSPARENT },
    gradientStops: stops,
    gradientTransform: linearGradientTransform(start, end, width, height),
    opacity: 1,
    visible: true
  }
}

const SIZE_KEYWORDS: Record<string, true> = {
  'closest-side': true,
  'closest-corner': true,
  'farthest-side': true,
  'farthest-corner': true
}

/** Whether a radial gradient's first argument is its shape/size/position header, not a stop. */
function isRadialHeader(nodes: Node[], width: number): boolean {
  if (nodes.length === 0) return false
  const words = nodes.map((node) => (node.type === 'word' ? node.value.toLowerCase() : ''))
  if (words.includes('at')) return true
  if (
    words.some(
      (word) => word === 'circle' || word === 'ellipse' || Object.hasOwn(SIZE_KEYWORDS, word)
    )
  ) {
    return true
  }
  if (parseDisplayableColor(valueParser.stringify(nodes[0])) !== null) return false
  return nodes.length <= 2 && nodes.every((node) => lengthOf(node, width) !== null)
}

/** A radial gradient's shape: a circle or ellipse, its size keyword, and explicit radii. */
interface RadialShape {
  circle: boolean
  sizeKeyword: string
  radii: number[]
  center: Vector
}

/** The shape/size/position header, or null when it is malformed. */
function radialHeader(head: Node[], width: number, height: number): RadialShape | null {
  const at = head.findIndex((node) => node.type === 'word' && node.value.toLowerCase() === 'at')
  const shapePart = at === -1 ? head : head.slice(0, at)
  const positionPart = at === -1 ? [] : head.slice(at + 1)
  let circle = false
  let sizeKeyword = 'farthest-corner'
  const radii: number[] = []
  for (const node of shapePart) {
    if (node.type !== 'word') return null
    const word = node.value.toLowerCase()
    if (word === 'circle') circle = true
    else if (word === 'ellipse') circle = false
    else if (Object.hasOwn(SIZE_KEYWORDS, word)) sizeKeyword = word
    else {
      const radius = lengthOf(node, radii.length === 0 || circle ? width : height)
      if (radius === null || radius < 0) return null
      radii.push(radius)
    }
  }
  if (radii.length === 1) circle = true
  if (radii.length > 2 || (circle && radii.length === 2)) return null
  const center = positionOf(positionPart, width, height)
  if (!center) return null
  return { circle, sizeKeyword, radii, center }
}

/** The ellipse radii in pixels a shape paints, per the CSS sizing keywords. */
function radialRadii(shape: RadialShape, width: number, height: number): Vector | null {
  const { circle, sizeKeyword, radii, center } = shape
  const cx = center.x * width
  const cy = center.y * height
  const farthest = sizeKeyword.startsWith('farthest')
  const pick = (a: number, b: number) => (farthest ? Math.max(a, b) : Math.min(a, b))
  const dx = pick(cx, width - cx)
  const dy = pick(cy, height - cy)
  if (radii.length > 0) {
    const rx = radii[0] ?? 0
    return { x: rx, y: circle ? rx : (radii[1] ?? 0) }
  }
  if (sizeKeyword.endsWith('corner')) {
    // A corner ellipse keeps the side distances' aspect, scaled to reach the corner.
    const distance = Math.hypot(dx, dy)
    return circle ? { x: distance, y: distance } : { x: dx * Math.SQRT2, y: dy * Math.SQRT2 }
  }
  return { x: dx, y: circle ? dx : dy }
}

function radialGradient(fn: FunctionNode, width: number, height: number): Fill | null {
  const args = layersOf(fn.nodes)
  if (args.length === 0 || width <= 0 || height <= 0) return null
  let shape: RadialShape = {
    circle: false,
    sizeKeyword: 'farthest-corner',
    radii: [],
    center: { x: 0.5, y: 0.5 }
  }
  let stopArgs = args
  const head = args[0] ?? []
  if (isRadialHeader(head, width)) {
    const parsed = radialHeader(head, width, height)
    if (!parsed) return null
    shape = parsed
    stopArgs = args.slice(1)
  }
  const radii = radialRadii(shape, width, height)
  if (!radii) return null
  const stops = stopsOf(stopArgs, radii.x)
  if (!stops) return null
  const { center } = shape
  const rx = radii.x
  const ry = radii.y
  if (rx <= 0 || ry <= 0) return null

  return {
    type: 'GRADIENT_RADIAL',
    color: { ...TRANSPARENT },
    gradientStops: stops,
    gradientTransform: ellipticalGradientTransform(
      center,
      { x: center.x + rx / width, y: center.y },
      { x: center.x, y: center.y + ry / height }
    ),
    opacity: 1,
    visible: true
  }
}

function conicGradient(fn: FunctionNode, width: number, height: number): Fill | null {
  const args = layersOf(fn.nodes)
  if (args.length === 0 || width <= 0 || height <= 0) return null
  let stopArgs = args
  let degrees = 0
  let center: Vector = { x: 0.5, y: 0.5 }

  const head = args[0] ?? []
  const from = head.findIndex((node) => node.type === 'word' && node.value.toLowerCase() === 'from')
  const at = head.findIndex((node) => node.type === 'word' && node.value.toLowerCase() === 'at')
  if (from !== -1 || at !== -1) {
    if (from !== -1) {
      const angle = angleOf(head[from + 1])
      if (angle === null) return null
      degrees = angle
    }
    if (at !== -1) {
      const positioned = positionOf(head.slice(at + 1), width, height)
      if (!positioned) return null
      center = positioned
    }
    stopArgs = args.slice(1)
  }

  const stops = stopsOf(stopArgs, null)
  if (!stops) return null

  // Figma's angular paint starts along gradient-space +x and turns clockwise; CSS starts up.
  // Rotate the start ray by (degrees - 90) so 0deg points up. The sweep is round on screen, so
  // each radius reaches the box edge along its own axis, as a radial gradient's do.
  const radians = ((degrees - 90) * Math.PI) / 180
  const radiusX = {
    x: center.x + (Math.cos(radians) * 0.5) / width,
    y: center.y + (Math.sin(radians) * 0.5) / height
  }
  const radiusY = {
    x: center.x - (Math.sin(radians) * 0.5) / width,
    y: center.y + (Math.cos(radians) * 0.5) / height
  }
  return {
    type: 'GRADIENT_ANGULAR',
    color: { ...TRANSPARENT },
    gradientStops: stops,
    gradientTransform: ellipticalGradientTransform(center, radiusX, radiusY),
    opacity: 1,
    visible: true
  }
}

/** The address inside a `url(...)` function, quotes stripped. */
function urlOf(fn: FunctionNode): string | null {
  const inner = fn.nodes
    .filter((node) => node.type !== 'space' && node.type !== 'comment')
    .map((node) => (node.type === 'string' ? node.value : valueParser.stringify(node)))
    .join('')
    .trim()
  return inner.length > 0 ? inner : null
}

const GRADIENT_BUILDERS: Partial<
  Record<string, (fn: FunctionNode, width: number, height: number) => Fill | null>
> = {
  'linear-gradient': linearGradient,
  'radial-gradient': radialGradient,
  'conic-gradient': conicGradient
}

/**
 * The layers of a CSS `background-image` list — `linear-gradient`, `radial-gradient`,
 * `conic-gradient`, and `url(...)` — as paints for a `width` × `height` box, in CSS order
 * (first on top). A layer that is none of these, or malformed, is dropped; an invalid value
 * paints nothing.
 */
export function parseCSSBackgroundImages(
  value: string | undefined,
  width: number,
  height: number
): CSSBackgroundLayer[] {
  if (!value) return []
  const layers: CSSBackgroundLayer[] = []
  for (const layer of layersOf(valueParser(value).nodes)) {
    const fn = layer[0]
    if (fn.type !== 'function' || layer.length > 1) continue
    if (fn.value.toLowerCase() === 'url') {
      const url = urlOf(fn)
      if (url) layers.push({ kind: 'image', url })
      continue
    }
    const build = GRADIENT_BUILDERS[fn.value.toLowerCase()]
    if (!build) continue
    const fill = build(fn, width, height)
    if (fill) layers.push({ kind: 'gradient', fill })
  }
  return layers
}

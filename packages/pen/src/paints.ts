import * as v from 'valibot'

import type {
  BlendMode,
  Fill,
  FillType,
  GradientStop,
  MeshGradientPoint,
  SceneNode,
  Stroke,
  StrokeCap,
  StrokeJoin
} from '@pairdraw/scene-graph'
import { TRANSPARENT } from '@pairdraw/scene-graph/constants'
import {
  ellipticalGradientTransform,
  isMeshFill,
  linearGradientTransformFromAxes,
  meshPointCount
} from '@pairdraw/scene-graph/gradient'
import type { Vector } from '@pairdraw/scene-graph/primitives'
import {
  createShaderSourcePaint,
  withShaderPaints,
  type ShaderPaint
} from '@pairdraw/scene-graph/shaders'

import { imagePaint, type PenImages } from './images'
import { meshPaintSchema } from './schema'
import type {
  PenGradientPaint,
  PenImagePaint,
  PenMeshPaint,
  PenLegacyStroke,
  PenNode,
  PenOverride,
  PenPaint,
  PenPaints,
  PenShaderPaint,
  PenSides
} from './schema'
import {
  bindIfVar,
  resolveBoolean,
  resolveColor,
  resolveNumber,
  type VarContext
} from './variables'

type PaintField = 'fills' | 'strokes'

/** Shader files a document's paints and effects name, by URL, as their source text. */
export type PenShaderSources = ReadonlyMap<string, string>

/** Where a shader file's source comes from, and the shader entries converted so far. */
interface PenShaderRead {
  sources: PenShaderSources | undefined
  /** Each shader paint converted, for the node's plugin data. */
  out: ShaderPaint[]
}

/**
 * pen.dev blend modes by name. Linear burn and linear dodge have no counterpart in the scene
 * graph, so they draw as normal.
 */
const BLEND_MODES: Partial<Record<string, BlendMode>> = {
  normal: 'NORMAL',
  darken: 'DARKEN',
  multiply: 'MULTIPLY',
  colorBurn: 'COLOR_BURN',
  light: 'LIGHTEN',
  screen: 'SCREEN',
  colorDodge: 'COLOR_DODGE',
  overlay: 'OVERLAY',
  softLight: 'SOFT_LIGHT',
  hardLight: 'HARD_LIGHT',
  difference: 'DIFFERENCE',
  exclusion: 'EXCLUSION',
  hue: 'HUE',
  saturation: 'SATURATION',
  color: 'COLOR',
  luminosity: 'LUMINOSITY'
}

export function mapBlendMode(value: string | undefined): BlendMode | undefined {
  return value === undefined ? undefined : BLEND_MODES[value]
}

const GRADIENT_TYPES: Partial<Record<string, FillType>> = {
  linear: 'GRADIENT_LINEAR',
  radial: 'GRADIENT_RADIAL',
  angular: 'GRADIENT_ANGULAR',
  diamond: 'GRADIENT_DIAMOND'
}

/**
 * pen.dev places a gradient in the layer's unit square: `center` defaults to the middle, a linear
 * gradient runs `size.height` long from bottom to top, and radial, diamond, and angular ones are
 * ellipses of diameter `size`. `rotation` turns all of it counter-clockwise in that square. An
 * angular gradient starts at the top and turns clockwise. Measured against pen.dev 2.21 renders.
 * A diamond gradient uses the same ellipse as a radial one.
 */
function gradientTransform(paint: PenGradientPaint, type: FillType, ctx: VarContext) {
  const center = { x: paint.center?.x ?? 0.5, y: paint.center?.y ?? 0.5 }
  const width = resolveNumber(paint.size?.width, ctx, 1)
  const height = resolveNumber(paint.size?.height, ctx, 1)
  const angle = (resolveNumber(paint.rotation, ctx) * Math.PI) / 180
  // Up, and right, after turning counter-clockwise on a y-down canvas.
  const up = { x: -Math.sin(angle), y: -Math.cos(angle) }
  const right = { x: Math.cos(angle), y: -Math.sin(angle) }
  const along = (direction: Vector, length: number): Vector => ({
    x: center.x + direction.x * length,
    y: center.y + direction.y * length
  })
  if (type === 'GRADIENT_LINEAR') {
    return linearGradientTransformFromAxes(along(up, -height / 2), along(up, height / 2), {
      x: right.x * height,
      y: right.y * height
    })
  }
  if (type === 'GRADIENT_ANGULAR') {
    return ellipticalGradientTransform(center, along(up, height / 2), along(right, width / 2))
  }
  // Radial and diamond gradients share this ellipse.
  return ellipticalGradientTransform(center, along(right, width / 2), {
    x: center.x - up.x * (height / 2),
    y: center.y - up.y * (height / 2)
  })
}

function gradientStops(paint: PenGradientPaint, ctx: VarContext): GradientStop[] {
  return (paint.colors ?? []).map((stop) => ({
    color: resolveColor(stop.color, ctx),
    position: resolveNumber(stop.position, ctx)
  }))
}

function convertPaint(
  paint: PenPaint,
  index: number,
  field: PaintField,
  ctx: VarContext,
  node: SceneNode | undefined,
  images: PenImages | undefined,
  shaders?: PenShaderRead
): Fill | null {
  if (typeof paint === 'string' || paint.type === 'color') {
    const raw = typeof paint === 'string' ? paint : paint.color
    if (typeof raw !== 'string') return null
    const color = resolveColor(raw, ctx)
    if (node) bindIfVar(node, `${field}/${index}/color`, raw, ctx)
    return {
      type: 'SOLID',
      color,
      opacity: color.a,
      visible: typeof paint === 'string' || resolveBoolean(paint.enabled, ctx),
      blendMode: typeof paint === 'string' ? undefined : mapBlendMode(paint.blendMode)
    }
  }
  if (paint.type === 'gradient') {
    const gradient = paint as PenGradientPaint
    // A gradient type this reader does not know falls back to the default, as other enumerated
    // values do, instead of dropping the fill.
    const type = GRADIENT_TYPES[gradient.gradientType ?? 'linear'] ?? 'GRADIENT_LINEAR'
    return {
      type,
      color: { ...TRANSPARENT },
      opacity: resolveNumber(gradient.opacity, ctx, 1),
      visible: resolveBoolean(gradient.enabled, ctx),
      blendMode: mapBlendMode(gradient.blendMode),
      gradientStops: gradientStops(gradient, ctx),
      gradientTransform: gradientTransform(gradient, type, ctx)
    }
  }
  if (paint.type === 'image') return convertImagePaint(paint as PenImagePaint, ctx, node, images)
  if (paint.type === 'mesh_gradient') return convertMeshPaint(paint, ctx)
  if (paint.type === 'shader') return convertShaderPaint(paint as PenShaderPaint, ctx, shaders)
  return null
}

/** A pen.dev image paint as the `IMAGE` fill that draws the image its URL names. */
function convertImagePaint(
  paint: PenImagePaint,
  ctx: VarContext,
  node: SceneNode | undefined,
  images: PenImages | undefined
): Fill | null {
  const image = paint.url ? images?.get(paint.url) : undefined
  if (!image) return null
  const box = { width: node?.width ?? 0, height: node?.height ?? 0 }
  return {
    ...imagePaint(paint, image, box, resolveNumber(paint.opacity, ctx, 1)),
    visible: resolveBoolean(paint.enabled, ctx),
    blendMode: mapBlendMode(paint.blendMode)
  }
}

/**
 * A pen.dev shader paint as the shader paint it draws: its source comes from the file `url` names,
 * which the host read as `PenReadOptions.shaders`. One whose source is missing draws nothing, as a
 * shader pen.dev cannot compile shows an empty frame.
 */
function convertShaderPaint(
  paint: PenShaderPaint,
  ctx: VarContext,
  shaders: PenShaderRead | undefined
): Fill | null {
  const source = paint.url === undefined ? undefined : shaders?.sources?.get(paint.url)
  if (!source || !shaders) return null
  const { paint: fill, shader } = createShaderSourcePaint(source)
  shaders.out.push(shader)
  return {
    ...fill,
    opacity: resolveNumber(paint.opacity, ctx, 1),
    visible: resolveBoolean(paint.enabled, ctx),
    blendMode: mapBlendMode(paint.blendMode)
  }
}

/**
 * A pen.dev mesh paint as a `MESH` fill. `columns` and `rows` count points per side, so the grid
 * between them is one smaller each way; a file that counts cells instead still matches when its
 * grid is one larger. Anything else is not a mesh this reader draws, so it is skipped.
 */
function convertMeshPaint(raw: unknown, ctx: VarContext): Fill | null {
  const parsed = v.safeParse(meshPaintSchema, raw)
  if (!parsed.success) return null
  const paint: PenMeshPaint = parsed.output
  const columns = Math.max(1, Math.floor(resolveNumber(paint.columns, ctx, 1)))
  const rows = Math.max(1, Math.floor(resolveNumber(paint.rows, ctx, 1)))
  const points = meshPoints(paint.colors ?? [], paint.points ?? [], ctx)
  if (!points) return null
  let meshColumns = columns
  let meshRows = rows
  if (points.length !== meshPointCount(meshColumns, meshRows)) {
    if (columns > 1 && rows > 1 && points.length === columns * rows) {
      meshColumns = columns - 1
      meshRows = rows - 1
    } else {
      return null
    }
  }
  const fill: Fill = {
    type: 'MESH',
    color: { ...TRANSPARENT },
    opacity: resolveNumber(paint.opacity, ctx, 1),
    visible: resolveBoolean(paint.enabled, ctx),
    blendMode: mapBlendMode(paint.blendMode),
    meshColumns,
    meshRows,
    meshPoints: points
  }
  return isMeshFill(fill) ? fill : null
}

/** One mesh point per vertex: a color with the point's position. */
function meshPoints(
  colors: readonly unknown[],
  positions: readonly unknown[],
  ctx: VarContext
): MeshGradientPoint[] | null {
  if (colors.length === 0 || colors.length !== positions.length) return null
  const points: MeshGradientPoint[] = []
  for (let index = 0; index < colors.length; index++) {
    const rawColor = colors[index]
    const rawPosition = positions[index]
    if (typeof rawColor !== 'string') return null
    let position: unknown = rawPosition
    if (typeof rawPosition === 'object' && rawPosition !== null && 'position' in rawPosition) {
      position = rawPosition.position
    }
    if (!Array.isArray(position) || position.length < 2) return null
    const [x, y] = position
    if (typeof x !== 'number' || typeof y !== 'number') return null
    points.push({
      position: { x: resolveNumber(x, ctx), y: resolveNumber(y, ctx) },
      color: resolveColor(rawColor, ctx)
    })
  }
  return points
}

/** A node's fills, or its strokes' paints, in pen.dev's order: the last one draws on top. */
export function convertPaints(
  paints: PenPaints | undefined,
  field: PaintField,
  ctx: VarContext,
  node?: SceneNode,
  images?: PenImages,
  shaders?: PenShaderSources
): Fill[] {
  if (paints === undefined) return []
  const list = Array.isArray(paints) ? paints : [paints]
  const result: Fill[] = []
  const read: PenShaderRead = { sources: shaders, out: [] }
  for (const paint of list) {
    const converted = convertPaint(paint, result.length, field, ctx, node, images, read)
    if (converted) result.push(converted)
  }
  if (node && read.out.length > 0) {
    const other = field === 'fills' ? node.strokes : node.fills
    node.pluginData = withShaderPaints(node, [...result, ...other], read.out)
  }
  return result
}

const ALIGNMENTS: Partial<Record<string, Stroke['align']>> = {
  inner: 'INSIDE',
  inside: 'INSIDE',
  center: 'CENTER',
  outer: 'OUTSIDE',
  outside: 'OUTSIDE'
}

const JOINS: Partial<Record<string, StrokeJoin>> = {
  miter: 'MITER',
  bevel: 'BEVEL',
  round: 'ROUND'
}
const CAPS: Partial<Record<string, StrokeCap>> = {
  butt: 'NONE',
  round: 'ROUND',
  square: 'SQUARE'
}

/** The stroke fields of a node, with the 2.8 object form spread into the current ones. */
export interface PenStrokeFields {
  paints: PenPaints | undefined
  width: PenNode['strokeWidth']
  alignment: string | undefined
  cap: string | undefined
  join: string | undefined
}

function isLegacyStroke(stroke: PenNode['stroke']): stroke is PenLegacyStroke {
  return typeof stroke === 'object' && !Array.isArray(stroke) && 'thickness' in stroke
}

/** A node's stroke fields; an instance's own fields replace its component's one by one. */
export function strokeFields(pen: PenOverride, base?: PenStrokeFields): PenStrokeFields {
  if (isLegacyStroke(pen.stroke)) {
    return {
      paints: pen.stroke.fill,
      width: pen.stroke.thickness,
      alignment: pen.stroke.align,
      cap: pen.stroke.cap,
      join: pen.stroke.join
    }
  }
  return {
    paints: pen.stroke ?? base?.paints,
    width: pen.strokeWidth ?? base?.width,
    alignment: pen.strokeAlignment ?? base?.alignment,
    cap: pen.strokeLinecap ?? base?.cap,
    join: pen.strokeLinejoin ?? base?.join
  }
}

const STROKE_SIDE_FIELDS = [
  ['top', 'borderTopWeight'],
  ['right', 'borderRightWeight'],
  ['bottom', 'borderBottomWeight'],
  ['left', 'borderLeftWeight']
] as const

/** A per-side width, with a `$name` on a side kept as that side's binding. */
function applySideWidths(node: SceneNode, sides: PenSides, ctx: VarContext): number {
  node.independentStrokeWeights = true
  let weight = 0
  for (const [side, field] of STROKE_SIDE_FIELDS) {
    const value = resolveNumber(sides[side], ctx)
    node[field] = value
    bindIfVar(node, field, sides[side], ctx)
    if (value > weight) weight = value
  }
  return weight
}

/**
 * Sets a node's strokes. pen.dev draws a stroke only with both paints and a width: a missing side
 * of a per-side width is zero, and the alignment defaults to centred.
 */
export function applyStroke(
  node: SceneNode,
  fields: PenStrokeFields,
  ctx: VarContext,
  images?: PenImages,
  shaders?: PenShaderSources
): void {
  node.strokes = []
  node.independentStrokeWeights = false
  if (fields.paints === undefined || fields.width === undefined) return

  let weight: number
  if (typeof fields.width === 'object') {
    weight = applySideWidths(node, fields.width, ctx)
  } else {
    weight = resolveNumber(fields.width, ctx)
    bindIfVar(node, 'strokeWeight', fields.width, ctx)
  }
  if (weight <= 0) return

  const align = ALIGNMENTS[fields.alignment ?? 'center'] ?? 'CENTER'
  const cap = CAPS[fields.cap ?? 'butt'] ?? 'NONE'
  const join = JOINS[fields.join ?? 'miter'] ?? 'MITER'
  node.strokeCap = cap
  node.strokeJoin = join
  node.strokes = convertPaints(fields.paints, 'strokes', ctx, node, images, shaders).map(
    (paint) => ({
      ...paint,
      weight,
      align,
      cap,
      join,
      dashPattern: []
    })
  )
}

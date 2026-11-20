import { clamp } from 'es-toolkit/math'
import { invert, mapValues, pickBy } from 'es-toolkit/object'
import { isEmptyObject } from 'es-toolkit/predicate'

import type { PaintFilter } from '@pairdraw/kiwi/fig'
import type { Paint, Effect as KiwiEffect } from '@pairdraw/kiwi/fig/codec'
import { guidToString, stringToGuid } from '@pairdraw/kiwi/fig/guid'
import type {
  Fill,
  Stroke,
  Effect,
  BlendMode,
  ImageFilters,
  ImageScaleMode,
  GradientTransform,
  NoiseEffectParams,
  StrokeCap,
  StrokeJoin,
  TextureEffectParams
} from '@pairdraw/scene-graph'
import { BLACK, UNSET_NOISE, UNSET_TEXTURE } from '@pairdraw/scene-graph/constants'
import type { Color, Matrix, Vector } from '@pairdraw/scene-graph/primitives'

import { hexToBytes } from './bytes'

/**
 * Figma's image adjustments by the archive's names. The schema has no `saturation`; `vibrance` is
 * its one saturation adjustment. `detail`, `vignette` and `brightness` have no plugin API name, so
 * a paint written from its fill leaves them out.
 */
const PAINT_FILTER_FIELDS = {
  exposure: 'exposure',
  contrast: 'contrast',
  saturation: 'vibrance',
  temperature: 'temperature',
  tint: 'tint',
  highlights: 'highlights',
  shadows: 'shadows'
} as const satisfies Record<keyof ImageFilters, keyof PaintFilter>

const IMAGE_FILTER_FIELDS = invert(PAINT_FILTER_FIELDS)

/** Figma keeps contrast at 0.3 of the plugin API's value, linear over -1 to 1; the rest as they are. */
const PAINT_FILTER_CONTRAST = 0.3

/** `adjustments` renamed by `names`, leaving out those at 0; undefined when every one is. */
function renameAdjustments<To extends string, From extends string>(
  names: Readonly<Record<To, From>>,
  adjustments: Partial<Record<From, number>> | undefined
): Partial<Record<To, number>> | undefined {
  if (!adjustments) return undefined
  const renamed = pickBy(
    mapValues(names, (name) => adjustments[name]),
    Boolean
  )
  return isEmptyObject(renamed) ? undefined : renamed
}

export function safeColor(color: Color | Omit<Color, 'a'>): Color {
  return { r: color.r, g: color.g, b: color.b, a: 'a' in color ? color.a : 1 }
}

/** Figma's format has no mesh type: a mesh paints its own color, and its grid rides in plugin data. */
function kiwiPaintType(fill: Fill): Paint['type'] {
  return fill.type === 'MESH' ? 'SOLID' : fill.type
}

/** Writes a fill's image adjustments as the archive's paint filter, leaving out those at 0. */
function writePaintFilter(paint: Paint, fill: Fill): void {
  const paintFilter = renameAdjustments(IMAGE_FILTER_FIELDS, fill.filters)
  if (paintFilter?.contrast) paintFilter.contrast *= PAINT_FILTER_CONTRAST
  if (paintFilter) paint.paintFilter = paintFilter
}

export function fillToKiwiPaint(fill: Fill): Paint {
  const paint: Paint = {
    type: kiwiPaintType(fill),
    color: safeColor(fill.color),
    opacity: fill.opacity,
    visible: fill.visible,
    blendMode: fill.blendMode ?? 'NORMAL'
  }
  if (fill.gradientStops) {
    paint.stops = fill.gradientStops.map((stop) => ({
      color: safeColor(stop.color),
      position: stop.position
    }))
  }
  if (fill.gradientTransform) paint.transform = fill.gradientTransform
  if (fill.imageHash) paint.image = { hash: hexToBytes(fill.imageHash) }
  if (fill.imageScaleMode)
    paint.imageScaleMode = fill.imageScaleMode === 'CROP' ? 'STRETCH' : fill.imageScaleMode
  if (fill.imageTransform) paint.transform = fill.imageTransform
  if (fill.imageRotation) paint.rotation = fill.imageRotation
  writePaintFilter(paint, fill)
  if (fill.sourceNodeId) paint.sourceNodeId = stringToGuid(fill.sourceNodeId)
  if (fill.scale) paint.scale = fill.scale
  if (fill.spacing) paint.spacing = fill.spacing
  if (fill.patternSpacing) paint.patternSpacing = fill.patternSpacing
  if (fill.patternTileType) paint.patternTileType = fill.patternTileType
  if (fill.verticalAlignment) paint.verticalAlignment = fill.verticalAlignment
  if (fill.horizontalAlignment) paint.horizontalAlignment = fill.horizontalAlignment
  if (fill.noiseType) paint.noiseType = fill.noiseType
  if (fill.density !== undefined) paint.density = fill.density
  if (fill.noiseSize) paint.noiseSize = fill.noiseSize
  if (fill.customEffectId) paint.customEffectId = { guid: stringToGuid(fill.customEffectId) }
  return paint
}

function convertColor(color?: Partial<Color>): Color {
  if (!color) return { ...BLACK }
  return { r: color.r ?? 0, g: color.g ?? 0, b: color.b ?? 0, a: color.a ?? 1 }
}

function imageHashToString(hash: Record<string, number>): string {
  const bytes = Object.keys(hash)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => hash[Number(k)])
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function convertGradientTransform(t?: Matrix): GradientTransform | undefined {
  if (!t) return undefined
  return { m00: t.m00, m01: t.m01, m02: t.m02, m10: t.m10, m11: t.m11, m12: t.m12 }
}

type VariableAliasRef = NonNullable<NonNullable<NonNullable<Paint['colorVar']>['value']>['alias']>

let variableColorResolver: ((alias: VariableAliasRef) => Color | null) | null = null

export function setVariableColorResolver(
  resolver: ((alias: VariableAliasRef) => Color | null) | null
): void {
  variableColorResolver = resolver
}

function resolveColorVar(paint: Paint): Color | undefined {
  const alias = paint.colorVar?.value?.alias
  if (!alias || !variableColorResolver) return undefined
  return variableColorResolver(alias) ?? undefined
}

function resolvedPaintColor(paint: Paint): { color: Color; opacity: number } {
  const resolved = resolveColorVar(paint)
  if (!resolved) return { color: convertColor(paint.color), opacity: paint.opacity ?? 1 }
  return {
    color: { ...resolved, a: paint.color?.a ?? 1 },
    opacity: paint.opacity ?? resolved.a
  }
}

function convertBaseFill(p: Paint): Fill {
  const { color, opacity } = resolvedPaintColor(p)
  return {
    type: p.type,
    color,
    opacity,
    visible: p.visible ?? true,
    blendMode: (p.blendMode ?? 'NORMAL') as BlendMode
  }
}

function applyGradientPaintFields(fill: Fill, p: Paint): void {
  if (!p.type.startsWith('GRADIENT') || !p.stops) return
  fill.gradientStops = p.stops.map((s) => ({
    color: convertColor(s.color),
    position: s.position
  }))
  if (p.transform) fill.gradientTransform = convertGradientTransform(p.transform)
}

function applyImagePaintFields(fill: Fill, p: Paint): void {
  if (p.type !== 'IMAGE') return
  if (p.image && typeof p.image === 'object') {
    const img = p.image as { hash: string | Record<string, number> }
    if (typeof img.hash === 'object') {
      fill.imageHash = imageHashToString(img.hash)
    } else if (typeof img.hash === 'string') {
      fill.imageHash = img.hash
    }
  }
  fill.imageScaleMode = (
    p.imageScaleMode === 'STRETCH' ? 'CROP' : (p.imageScaleMode ?? 'FILL')
  ) as ImageScaleMode
  // Figma writes an identity transform for Fill, Fit and Tile, and ignores what a Tile keeps from
  // an earlier crop; only a crop places the image by it.
  if (p.transform && fill.imageScaleMode === 'CROP')
    fill.imageTransform = convertGradientTransform(p.transform)
  if (p.rotation) fill.imageRotation = p.rotation
  const filters = renameAdjustments(PAINT_FILTER_FIELDS, p.paintFilter)
  if (filters?.contrast) filters.contrast /= PAINT_FILTER_CONTRAST
  if (filters) fill.filters = filters
}

function applySchemaPaintFields(fill: Fill, p: Paint): void {
  if (p.sourceNodeId) fill.sourceNodeId = guidToString(p.sourceNodeId)
  if (p.scale) fill.scale = p.scale
  if (p.spacing) fill.spacing = p.spacing
  if (p.patternSpacing) fill.patternSpacing = p.patternSpacing
  if (p.patternTileType) fill.patternTileType = p.patternTileType as Fill['patternTileType']
  if (p.verticalAlignment) fill.verticalAlignment = p.verticalAlignment as Fill['verticalAlignment']
  if (p.horizontalAlignment)
    fill.horizontalAlignment = p.horizontalAlignment as Fill['horizontalAlignment']
  if (p.noiseType) fill.noiseType = p.noiseType as Fill['noiseType']
  if (p.density !== undefined) fill.density = p.density
  if (p.noiseSize) fill.noiseSize = p.noiseSize
  if (p.customEffectId?.guid) fill.customEffectId = guidToString(p.customEffectId.guid)
}

/** One Figma paint as a Scene Graph paint, whether it ends up a fill or a stroke. */
function convertPaint(p: Paint): Fill {
  const fill = convertBaseFill(p)
  applyGradientPaintFields(fill, p)
  applyImagePaintFields(fill, p)
  applySchemaPaintFields(fill, p)
  return fill
}

export function convertFills(paints?: Paint[]): Fill[] {
  if (!paints) return []
  return paints.map(convertPaint)
}

/** A Kiwi stroke alignment; Figma leaves out the centered default. */
export function convertStrokeAlign(align?: string): Stroke['align'] {
  return align === 'INSIDE' || align === 'OUTSIDE' ? align : 'CENTER'
}

export function convertStrokes(
  paints?: Paint[],
  weight?: number,
  align?: string,
  cap?: StrokeCap,
  join?: StrokeJoin,
  dashPattern?: number[]
): Stroke[] {
  if (!paints) return []
  const strokeAlign = convertStrokeAlign(align)

  return paints.map((p) => ({
    ...convertPaint(p),
    weight: weight ?? 1,
    align: strokeAlign,
    cap: cap ?? 'NONE',
    join: join ?? 'MITER',
    dashPattern: dashPattern ?? []
  }))
}

/** The scene graph's name for each `.fig` effect type it models; it leaves the others out. */
const MODELED_EFFECT_TYPES: Partial<
  Record<KiwiEffect['type'], Exclude<Effect['type'], 'SHADER'>>
> = {
  DROP_SHADOW: 'DROP_SHADOW',
  INNER_SHADOW: 'INNER_SHADOW',
  LAYER_BLUR: 'LAYER_BLUR',
  BACKGROUND_BLUR: 'BACKGROUND_BLUR',
  FOREGROUND_BLUR: 'FOREGROUND_BLUR',
  NOISE: 'NOISE',
  GRAIN: 'TEXTURE'
}

/** The scene graph's type for a `.fig` effect type, or null for one it does not model. */
export function modeledEffectType(
  type: KiwiEffect['type']
): Exclude<Effect['type'], 'SHADER'> | null {
  return MODELED_EFFECT_TYPES[type] ?? null
}

/**
 * Each `.fig` effect's index among the effects the scene graph keeps, and null for one it leaves
 * out, such as a repeat. Variable bindings name effects by this index, so every reader of a
 * record's effects must count the same way.
 */
export function modeledEffectIndexes(effects: readonly KiwiEffect[]): (number | null)[] {
  let next = 0
  return effects.map((effect) => (modeledEffectType(effect.type) ? next++ : null))
}

/**
 * A record's effects as the scene graph models them. Types it does not model stay out of
 * `effects`; the record's raw payload keeps them for `.fig` export.
 */
export function convertEffects(effects?: KiwiEffect[]): Effect[] {
  if (!effects) return []
  return effects.flatMap((e): Effect[] => {
    const type = modeledEffectType(e.type)
    if (!type) return []
    const blendMode = (e.blendMode ?? 'NORMAL') as BlendMode
    const visible = e.visible ?? true
    if (type === 'NOISE') {
      return [{ type, color: convertColor(e.color), visible, blendMode, noise: convertNoise(e) }]
    }
    if (type === 'TEXTURE') {
      return [
        {
          type,
          color: convertColor(e.color),
          radius: e.radius ?? 0,
          visible,
          blendMode,
          texture: convertTexture(e)
        }
      ]
    }
    return [
      {
        type,
        color: convertColor(e.color),
        offset: e.offset ?? { x: 0, y: 0 },
        radius: e.radius ?? 0,
        spread: e.spread ?? 0,
        visible,
        blendMode,
        showShadowBehindNode: e.showShadowBehindNode ?? true
      }
    ]
  })
}

/** A noise effect's grain; only a duotone keeps a second colour, only a multitone an opacity. */
function convertNoise(e: KiwiEffect): NoiseEffectParams {
  const noise: NoiseEffectParams = {
    noiseType: e.noiseType ?? UNSET_NOISE.noiseType,
    noiseSize: grainSize(e.noiseSize, UNSET_NOISE.noiseSize),
    density: finiteWithin(e.density, UNSET_NOISE.density, 0, 1)
  }
  // A duotone without a second colour draws both tones in its first, as the renderer does.
  if (noise.noiseType === 'DUOTONE')
    noise.secondaryColor = convertColor(e.secondaryColor ?? e.color)
  if (noise.noiseType === 'MULTITONE') noise.opacity = finiteWithin(e.opacity, 1, 0, 1)
  if (e.seed !== undefined && Number.isFinite(e.seed)) noise.seed = e.seed
  return noise
}

/** A grain effect's texture; its `radius` stays the effect's own. */
function convertTexture(e: KiwiEffect): TextureEffectParams {
  const texture: TextureEffectParams = {
    noiseSize: grainSize(e.noiseSize, UNSET_TEXTURE.noiseSize),
    clipToShape: e.clipToShape ?? UNSET_TEXTURE.clipToShape
  }
  if (e.seed !== undefined && Number.isFinite(e.seed)) texture.seed = e.seed
  return texture
}

/** The most Figma lets a grain size be on either axis. */
const MAX_GRAIN_SIZE = 100

/**
 * `value` held within Figma's range for it, or `fallback` where a file stores no number there:
 * a damaged or hand-made record must not reach the renderer as NaN.
 */
function finiteWithin(value: number | undefined, fallback: number, min: number, max: number) {
  return value !== undefined && Number.isFinite(value) ? clamp(value, min, max) : fallback
}

function grainSize(size: Vector | undefined, fallback: Vector): Vector {
  return {
    x: finiteWithin(size?.x, fallback.x, 0, MAX_GRAIN_SIZE),
    y: finiteWithin(size?.y, fallback.y, 0, MAX_GRAIN_SIZE)
  }
}

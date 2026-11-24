import { fromUint8Array } from 'js-base64'

import type {
  ColorProfile,
  Fill,
  FontVariation,
  SceneGraph,
  SceneNode
} from '@pairdraw/scene-graph'
import {
  colorToHex,
  colorToProfileCSS,
  convertColor,
  getDefaultRenderColorSpace,
  type RenderColorSpace
} from '@pairdraw/scene-graph/color'
import {
  gradientPoint,
  invertGradientTransform,
  isIdentityGradientTransform
} from '@pairdraw/scene-graph/gradient'
import { imageMimeType } from '@pairdraw/scene-graph/images'
import type { Color } from '@pairdraw/scene-graph/primitives'

import type { BooleanPathResolver } from '#core/io/formats/boolean-path'
import type { FontFaceRef } from '#core/text/font/faces'

import { svg, type SVGNode } from './node'
import { round } from './paths'
import type { SVGTextLayout } from './text/lines'

/**
 * A face text is drawn in, with what sets its axes: the font size the optical size follows unless
 * `opticalSizeFromFontSize` is off, and the axes the text sets.
 */
export interface SVGFontRequest extends FontFaceRef {
  /** Which of the style's files draws the text, 0 for its own then its shards; 0 when left out. */
  file?: number
  fontSize: number
  variations: readonly FontVariation[]
  opticalSizeFromFontSize: boolean
}

/** The family to name a font face by instead of its own, or null to keep the face. */
export type SVGFontAlias = (font: SVGFontRequest) => string | null

export interface SVGExportContext {
  defs: SVGNode[]
  defIdCounter: number
  graph: SceneGraph
  /** The space the export writes colors in. */
  colorSpace: RenderColorSpace
  /** The document's profile: the space its stored color components are in. */
  documentColorSpace: ColorProfile
  /** Starts every def id, so SVGs inlined on one page cannot reference each other's defs. */
  idPrefix?: string
  /** Paints drawn in `currentColor`, such as an icon's tinted paths, so CSS `color` sets them. */
  tint?: (node: SceneNode) => readonly ('fill' | 'stroke')[]
  /** Measured line breaks. Without them, only explicit newlines start a new baseline. */
  textLayout?: SVGTextLayout
  fontAlias?: SVGFontAlias
  /** The live result path of a boolean made in Pairdraw, which stores none. */
  booleanPath?: BooleanPathResolver
}

export function nextDefId(ctx: SVGExportContext, prefix: string): string {
  return `${ctx.idPrefix ?? ''}${prefix}${ctx.defIdCounter++}`
}

export function formatColor(
  color: Color,
  opacity = 1,
  colorSpace: RenderColorSpace = getDefaultRenderColorSpace(),
  documentSpace: ColorProfile = 'srgb'
): string {
  const painted = { ...color, a: color.a * opacity }
  // Stored components sit in the document's profile; write the color in the profile it is shown in.
  if (colorSpace === 'display-p3') return colorToProfileCSS(painted, documentSpace, 'display-p3')
  const alphaColor = convertColor(painted, documentSpace, 'srgb')
  // Hex has no alpha. Stops and shadows already emit theirs; solid fills use `solidFillOpacity`.
  return colorToHex(alphaColor)
}

/**
 * A solid paint's SVG color. The canvas paints `opacity` and drops color alpha: `setAlphaf`
 * replaces it, and `.pen` stores a hex alpha in both fields. Display P3 carries that painted
 * alpha in the color. sRGB hex cannot, so `solidFillOpacity` emits it beside the color.
 */
export function formatSolidColor(
  color: Color,
  opacity: number,
  colorSpace: RenderColorSpace,
  documentSpace: ColorProfile = 'srgb'
): string {
  if (colorSpace === 'display-p3') {
    return formatColor({ ...color, a: 1 }, round(opacity), colorSpace, documentSpace)
  }
  return formatColor(color, 1, colorSpace, documentSpace)
}

/**
 * `fill-opacity` for a solid paint. Omitted at full opacity so an opaque export stays unchanged.
 * Display P3 already carries the same alpha in the color `formatSolidColor` returns, unless
 * `separate` is set because that color was replaced and can no longer carry it.
 */
export function solidFillOpacity(
  fill: Fill,
  colorSpace: RenderColorSpace,
  separate = false
): number | undefined {
  if (fill.type !== 'SOLID' || (colorSpace === 'display-p3' && !separate)) return undefined
  const alpha = round(fill.opacity)
  return alpha < 1 ? alpha : undefined
}

function createGradientDef(
  fill: Fill,
  node: SceneNode,
  ctx: SVGExportContext
): { id: string; node: SVGNode } | null {
  const stops = fill.gradientStops
  const t = fill.gradientTransform
  if (!stops || !t) return null

  const stopNodes = stops.map((s) =>
    svg('stop', {
      offset: `${round(s.position * 100)}%`,
      'stop-color': formatColor(s.color, 1, ctx.colorSpace, ctx.documentColorSpace),
      'stop-opacity': s.color.a < 1 ? round(s.color.a) : undefined
    })
  )

  const id = nextDefId(ctx, 'grad')

  // Gradient space in bounding-box units, mapped onto the layer as the canvas draws it.
  const toLayer = invertGradientTransform(t)
  const transform = isIdentityGradientTransform(toLayer)
    ? undefined
    : `matrix(${[toLayer.m00, toLayer.m10, toLayer.m01, toLayer.m11, toLayer.m02, toLayer.m12].map((v) => round(v, 6)).join(' ')})`

  if (fill.type === 'GRADIENT_LINEAR') {
    return {
      id,
      node: svg(
        'linearGradient',
        {
          id,
          x1: 0,
          y1: 0.5,
          x2: 1,
          y2: 0.5,
          gradientUnits: 'objectBoundingBox',
          gradientTransform: transform
        },
        ...stopNodes
      )
    }
  }

  // SVG has no diamond gradient, so a diamond exports as the radial one it is closest to.
  if (fill.type === 'GRADIENT_RADIAL' || fill.type === 'GRADIENT_DIAMOND') {
    return {
      id,
      node: svg(
        'radialGradient',
        {
          id,
          cx: 0.5,
          cy: 0.5,
          r: 0.5,
          gradientUnits: 'objectBoundingBox',
          gradientTransform: transform
        },
        ...stopNodes
      )
    }
  }

  // Nor an angular one: it exports as a radial gradient around its centre.
  if (fill.type === 'GRADIENT_ANGULAR') {
    const center = gradientPoint(t, { x: 0.5, y: 0.5 })
    const cx = round(center.x * node.width)
    const cy = round(center.y * node.height)
    const r = Math.max(node.width, node.height)
    return {
      id,
      node: svg('radialGradient', { id, cx, cy, r, gradientUnits: 'userSpaceOnUse' }, ...stopNodes)
    }
  }

  return null
}

function createImagePattern(
  fill: Fill,
  node: SceneNode,
  ctx: SVGExportContext
): { id: string; node: SVGNode } | null {
  if (!fill.imageHash) return null
  const data = ctx.graph.images.get(fill.imageHash)
  if (!data) return null

  const id = nextDefId(ctx, 'img')
  const base64 = fromUint8Array(data)
  const mime = imageMimeType(data)

  return {
    id,
    node: svg(
      'pattern',
      {
        id,
        patternUnits: 'objectBoundingBox',
        width: 1,
        height: 1,
        patternTransform: fill.imageRotation
          ? `rotate(${round(fill.imageRotation)} 0.5 0.5)`
          : undefined
      },
      svg('image', {
        href: `data:${mime};base64,${base64}`,
        width: node.width,
        height: node.height,
        preserveAspectRatio: fill.imageScaleMode === 'FIT' ? 'xMidYMid meet' : 'xMidYMid slice'
      })
    )
  }
}

export function resolveFill(fill: Fill, node: SceneNode, ctx: SVGExportContext): string | null {
  if (!fill.visible) return null

  if (fill.type === 'SOLID') {
    return formatSolidColor(fill.color, fill.opacity, ctx.colorSpace, ctx.documentColorSpace)
  }

  // SVG has no mesh element: a mesh exports its own color, as `.fig` records carry it.
  if (fill.type === 'MESH') {
    return formatSolidColor(fill.color, fill.opacity, ctx.colorSpace, ctx.documentColorSpace)
  }

  // The canvas draws a pattern, noise or custom paint as its own colour when the format has no
  // element for it, so the export must not drop the layer.
  if (fill.type === 'PATTERN' || fill.type === 'NOISE' || fill.type === 'CUSTOM') {
    return formatSolidColor(fill.color, fill.opacity, ctx.colorSpace, ctx.documentColorSpace)
  }

  if (fill.type.startsWith('GRADIENT')) {
    const grad = createGradientDef(fill, node, ctx)
    if (grad) {
      ctx.defs.push(grad.node)
      return `url(#${grad.id})`
    }
  }

  if (fill.type === 'IMAGE') {
    const pattern = createImagePattern(fill, node, ctx)
    if (pattern) {
      ctx.defs.push(pattern.node)
      return `url(#${pattern.id})`
    }
  }

  return null
}

export const SVG_STROKE_CAP: Record<string, string> = {
  NONE: 'butt',
  ROUND: 'round',
  SQUARE: 'square'
}

export const SVG_STROKE_JOIN: Record<string, string> = {
  MITER: 'miter',
  ROUND: 'round',
  BEVEL: 'bevel'
}

export const SVG_BLEND_MODE: Record<string, string> = {
  NORMAL: 'normal',
  DARKEN: 'darken',
  MULTIPLY: 'multiply',
  COLOR_BURN: 'color-burn',
  LIGHTEN: 'lighten',
  LINEAR_BURN: 'plus-darker',
  SCREEN: 'screen',
  LINEAR_DODGE: 'plus-lighter',
  COLOR_DODGE: 'color-dodge',
  OVERLAY: 'overlay',
  SOFT_LIGHT: 'soft-light',
  HARD_LIGHT: 'hard-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity'
}

import type {
  Effect,
  Fill,
  GradientStop,
  ShadowEffect,
  Stroke,
  TextLength
} from '@pairdraw/scene-graph'
import { colorToCSS, colorToHex } from '@pairdraw/scene-graph/color'
import { gradientPoint } from '@pairdraw/scene-graph/gradient'
import type { Color, Vector } from '@pairdraw/scene-graph/primitives'

import type { DesignStyleDeclaration } from '../types'

/** Opaque colors as hex, which Tailwind matches to its palette; translucent ones as `rgba()`. */
export function cssColor(color: Color): string {
  return color.a >= 1 ? colorToHex(color) : colorToCSS(color)
}

export function fillToCSS(fill: Fill | undefined): string | undefined {
  if (fill?.type !== 'SOLID' || !fill.visible) return undefined
  return cssColor({ ...fill.color, a: fill.opacity })
}

/** A number CSS reads the same back: six decimals, no trailing zeros or negative zero. */
function cssNumber(value: number): string {
  const rounded = Number(value.toFixed(6))
  return String(rounded === 0 ? 0 : rounded)
}

function stopToCSS(stop: GradientStop, opacity: number): string {
  const color = cssColor({ ...stop.color, a: stop.color.a * opacity })
  return `${color} ${cssNumber(stop.position * 100)}%`
}

/** The unit-square point as a CSS position pair, percentages of the box's width and height. */
function positionToCSS(point: Vector): string {
  return `${cssNumber(point.x * 100)}% ${cssNumber(point.y * 100)}%`
}

/**
 * A gradient paint as the CSS gradient that draws it in a `width` × `height` box. The transform
 * maps the box's unit square onto gradient space; its inverse gives the line's ends, the
 * ellipse's centre and radii, or the sweep's start ray. Diamond gradients have no CSS spelling.
 */
export function gradientFillToCSS(fill: Fill, width: number, height: number): string | undefined {
  const transform = fill.gradientTransform
  const stops = fill.gradientStops
  if (!fill.visible || !transform || !stops || stops.length === 0 || width <= 0 || height <= 0) {
    return undefined
  }
  const painted = stops.map((stop) => stopToCSS(stop, fill.opacity)).join(', ')
  if (fill.type === 'GRADIENT_LINEAR') {
    const start = gradientPoint(transform, { x: 0, y: 0.5 })
    const end = gradientPoint(transform, { x: 1, y: 0.5 })
    const dx = (end.x - start.x) * width
    const dy = (end.y - start.y) * height
    if (dx === 0 && dy === 0) return undefined
    // CSS angles point up at 0deg and turn clockwise; screen y grows downward.
    const degrees = (Math.atan2(dx, -dy) * 180) / Math.PI
    return `linear-gradient(${cssNumber(degrees)}deg, ${painted})`
  }
  if (fill.type !== 'GRADIENT_RADIAL' && fill.type !== 'GRADIENT_ANGULAR') return undefined
  const center = gradientPoint(transform, { x: 0.5, y: 0.5 })
  const edgeX = gradientPoint(transform, { x: 1, y: 0.5 })
  const edgeY = gradientPoint(transform, { x: 0.5, y: 1 })
  const rx = Math.hypot((edgeX.x - center.x) * width, (edgeX.y - center.y) * height)
  const ry = Math.hypot((edgeY.x - center.x) * width, (edgeY.y - center.y) * height)
  if (rx <= 0 || ry <= 0) return undefined
  const at = `at ${positionToCSS(center)}`
  if (fill.type === 'GRADIENT_RADIAL') {
    const shape =
      Math.abs(rx - ry) < 1e-6
        ? `circle ${cssNumber(rx)}px`
        : `ellipse ${cssNumber(rx)}px ${cssNumber(ry)}px`
    return `radial-gradient(${shape} ${at}, ${painted})`
  }
  const degrees =
    (Math.atan2((edgeX.y - center.y) * height, (edgeX.x - center.x) * width) * 180) / Math.PI + 90
  return `conic-gradient(from ${cssNumber(degrees)}deg ${at}, ${painted})`
}

/**
 * The paint stack as `background-image`, top layer first as CSS paints it. Solid paints stay
 * out; the bottom one becomes `background-color`, and a solid above another paint has no CSS
 * spelling here. Image paints export through the element's own source, not this list.
 */
export function gradientFillsToCSS(
  fills: Fill[],
  width: number,
  height: number
): string | undefined {
  const layers: string[] = []
  for (let index = fills.length - 1; index >= 0; index--) {
    const css = gradientFillToCSS(fills[index], width, height)
    if (css) layers.push(css)
  }
  return layers.length > 0 ? layers.join(', ') : undefined
}

export function strokeColorToCSS(stroke: Stroke | undefined): string | undefined {
  if (!stroke?.visible) return undefined
  return cssColor({ ...stroke.color, a: stroke.opacity })
}

function shadowToCSS(effect: ShadowEffect): string {
  const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : ''
  return `${inset}${effect.offset.x}px ${effect.offset.y}px ${effect.radius}px ${effect.spread}px ${cssColor(effect.color)}`
}

export function dropShadowToCSS(effect: Effect | undefined): string | undefined {
  if (effect?.type !== 'DROP_SHADOW' || !effect.visible) return undefined
  return shadowToCSS(effect)
}

/** Every visible shadow, in order, plus layer and background blur. */
export function effectsToCSS(effects: Effect[]): DesignStyleDeclaration {
  const style: DesignStyleDeclaration = {}
  const visible = effects.filter((effect) => effect.visible)
  const shadows = visible.filter(
    (effect): effect is ShadowEffect =>
      effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
  )
  if (shadows.length > 0) style['box-shadow'] = shadows.map(shadowToCSS).join(', ')
  for (const effect of visible) {
    if (effect.type === 'LAYER_BLUR' || effect.type === 'FOREGROUND_BLUR')
      style.filter = `blur(${effect.radius}px)`
    if (effect.type === 'BACKGROUND_BLUR') style['backdrop-filter'] = `blur(${effect.radius}px)`
  }
  return style
}

/** A line height as CSS writes it: a percent as the unitless multiple that follows the font size. */
export function lineHeightToCSS(length: TextLength): string {
  return length.unit === 'PIXELS' ? `${length.value}px` : String(length.value / 100)
}

/** A letter spacing as CSS writes it: a percent of the font size in `em`. */
export function letterSpacingToCSS(length: TextLength): string {
  return length.unit === 'PIXELS' ? `${length.value}px` : `${length.value / 100}em`
}

/**
 * Room for the spacing CSS puts after a line's last letter. A layer fits and aligns its lines by
 * their glyphs, without that spacing, so a spaced text's box is one spacing wider than its own
 * width and a negative margin takes the spacing back: lines break and align as on the canvas, and
 * the text takes the room it does there. Browsers put the spacing on a glyph's right in either
 * direction, so the margin is on the right. `spacing` is the CSS the text's letter spacing is
 * written as, which may refer to a token.
 */
export function letterSpacingRoomCSS(
  length: TextLength,
  spacing: string,
  width: string | undefined
): DesignStyleDeclaration {
  const literal = spacing === letterSpacingToCSS(length)
  return {
    ...(width !== undefined && { width: `calc(${width} + ${spacing})` }),
    'margin-right': literal
      ? letterSpacingToCSS({ ...length, value: -length.value })
      : `calc(-1 * ${spacing})`
  }
}

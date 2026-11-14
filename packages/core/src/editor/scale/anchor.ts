import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

/**
 * The nine points of the Scale tool's anchor grid, row by row from the top left: the point of the
 * selection's bounds that stays put while it scales.
 */
export const SCALE_ANCHORS = [
  'top-left',
  'top',
  'top-right',
  'left',
  'center',
  'right',
  'bottom-left',
  'bottom',
  'bottom-right'
] as const

export type ScaleAnchor = (typeof SCALE_ANCHORS)[number]

/** Where Figma's Scale tool scales from until another anchor is picked. */
export const DEFAULT_SCALE_ANCHOR: ScaleAnchor = 'top-left'

const ANCHOR_FRACTIONS: Readonly<Record<ScaleAnchor, Vector>> = {
  'top-left': { x: 0, y: 0 },
  top: { x: 0.5, y: 0 },
  'top-right': { x: 1, y: 0 },
  left: { x: 0, y: 0.5 },
  center: { x: 0.5, y: 0.5 },
  right: { x: 1, y: 0.5 },
  'bottom-left': { x: 0, y: 1 },
  bottom: { x: 0.5, y: 1 },
  'bottom-right': { x: 1, y: 1 }
}

export function isScaleAnchor(value: unknown): value is ScaleAnchor {
  return SCALE_ANCHORS.some((anchor) => anchor === value)
}

/** The anchor's place in a box, as fractions of its width and height. */
export function scaleAnchorFraction(anchor: ScaleAnchor): Vector {
  return ANCHOR_FRACTIONS[anchor]
}

/** The point of `bounds` that `anchor` names. */
export function scaleAnchorPoint(bounds: Rect, anchor: ScaleAnchor): Vector {
  const { x, y } = ANCHOR_FRACTIONS[anchor]
  return { x: bounds.x + bounds.width * x, y: bounds.y + bounds.height * y }
}

/** Where `point` lands when everything scales by `factor` around `origin`. */
export function scaleAroundPoint(point: Vector, origin: Vector, factor: number): Vector {
  return {
    x: origin.x + (point.x - origin.x) * factor,
    y: origin.y + (point.y - origin.y) * factor
  }
}

/** The box `bounds` becomes when it scales by `factor` around its `anchor` point. */
export function scaledBounds(bounds: Rect, anchor: ScaleAnchor | Vector, factor: number): Rect {
  const origin = typeof anchor === 'string' ? scaleAnchorPoint(bounds, anchor) : anchor
  const topLeft = scaleAroundPoint(bounds, origin, factor)
  return { ...topLeft, width: bounds.width * factor, height: bounds.height * factor }
}

/**
 * The factor that brings a side of `size` to `target`, as typing a width or height in the Scale
 * panel does; null for a size that cannot scale or a target that is not a length.
 */
export function scaleFactorForSize(size: number, target: number): number | null {
  if (!(size > 0) || !Number.isFinite(target) || !(target > 0)) return null
  return target / size
}

/**
 * Reads a typed scale factor as Figma's Scale panel takes it: `2`, `2x`, `0.5×`, or `200%`; null
 * when it is not a positive number.
 */
export function parseScaleFactor(text: string): number | null {
  const match = /^\s*([0-9]*[.,]?[0-9]+)\s*(%|x|×)?\s*$/i.exec(text)
  if (!match) return null
  const value = Number.parseFloat(match[1].replace(',', '.'))
  const factor = match[2] === '%' ? value / 100 : value
  return Number.isFinite(factor) && factor > 0 ? factor : null
}

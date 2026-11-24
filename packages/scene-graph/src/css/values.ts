import valueParser, { type Node } from 'postcss-value-parser'

import { tryParseColor } from '../color'
import type { Color } from '../primitives'
import type { DocumentColorSpace } from '../types'

/** Pixels in a rem, as browsers use by default. */
const ROOT_FONT_SIZE = 16

/**
 * A CSS number in pixels: unitless, `px`, or `rem`. Null for `auto`, for units that depend on
 * what the value applies to (`%`, `em`, `vh`), and for anything that is not a number.
 */
export function parseCSSNumber(value: string | undefined): number | null {
  if (!value) return null
  const dimension = valueParser.unit(value.trim())
  if (!dimension) return null
  const number = Number(dimension.number)
  if (!Number.isFinite(number)) return null
  switch (dimension.unit.toLowerCase()) {
    case '':
    case 'px':
      return number
    case 'rem':
      return number * ROOT_FONT_SIZE
    default:
      return null
  }
}

/**
 * A CSS color that paints something, as components in `profile`; null for an invalid or fully
 * transparent one. A stylesheet's own declarations are read in sRGB, as CSS authors them; a caller
 * reading markup into a document passes the document's profile.
 */
export function parseCSSColor(
  value: string | undefined,
  profile: DocumentColorSpace = 'srgb'
): Color | null {
  if (!value) return null
  const color = tryParseColor(value.trim(), profile)
  return color && color.a > 0 ? color : null
}

/** The space-separated parts of a CSS value, keeping functions such as `rgb(0, 0, 0)` whole. */
export function splitCSSValue(value: string): string[] {
  return valueParser(value)
    .nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')
    .map((node) => valueParser.stringify(node))
}

/** The layers of a CSS value list, split at its top-level commas, spaces and comments dropped. */
export function cssLayers(nodes: Node[]): Node[][] {
  const layers: Node[][] = []
  let current: Node[] = []
  for (const node of nodes) {
    if (node.type === 'div' && node.value === ',') {
      layers.push(current)
      current = []
    } else if (node.type !== 'space' && node.type !== 'comment') {
      current.push(node)
    }
  }
  layers.push(current)
  return layers
}

/** A word's finite number and lowercased unit, or null for anything that is not a dimension. */
export function cssDimension(node: Node | undefined): { value: number; unit: string } | null {
  if (node?.type !== 'word') return null
  const dimension = valueParser.unit(node.value)
  if (!dimension) return null
  const value = Number(dimension.number)
  if (!Number.isFinite(value)) return null
  return { value, unit: dimension.unit.toLowerCase() }
}

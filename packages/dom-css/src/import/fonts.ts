import { DEFAULT_FONT_FAMILY } from '@pairdraw/scene-graph/constants'
import { parseCSSFontFamilies } from '@pairdraw/scene-graph/css'

/** CSS generic families, by the concrete face class they stand for. */
const GENERIC_FAMILIES: Record<string, 'sans-serif' | 'serif' | 'monospace' | undefined> = {
  'sans-serif': 'sans-serif',
  'ui-sans-serif': 'sans-serif',
  'system-ui': 'sans-serif',
  '-apple-system': 'sans-serif',
  blinkmacsystemfont: 'sans-serif',
  serif: 'serif',
  'ui-serif': 'serif',
  monospace: 'monospace',
  'ui-monospace': 'monospace'
}

/** Known system faces of each class, best first. The app bundles Inter for sans-serif. */
const DEFAULT_FAMILIES = {
  'sans-serif': [DEFAULT_FONT_FAMILY],
  serif: ['Georgia', 'Times New Roman', 'Times'],
  monospace: ['Menlo', 'SF Mono', 'Consolas', 'Courier New']
} as const satisfies Record<'sans-serif' | 'serif' | 'monospace', readonly string[]>

export interface FontStackOptions {
  /**
   * Whether the document can draw a family, such as the font service answering. Without it every
   * concrete family is taken as available, as a headless import has no faces to ask.
   */
  isAvailable?: (family: string) => boolean
}

function defaultFamily(
  kind: 'sans-serif' | 'serif' | 'monospace',
  options: FontStackOptions
): string {
  const candidates = DEFAULT_FAMILIES[kind]
  return (
    (options.isAvailable ? candidates.find((family) => options.isAvailable?.(family)) : null) ??
    candidates[0]
  )
}

/**
 * The family a CSS `font-family` stack asks a document to draw: the first concrete family the
 * font service can provide; a generic keyword maps to a concrete face of its class. Null when the
 * list has no family.
 */
export function resolveFontFamilyStack(
  value: string | undefined,
  options: FontStackOptions = {}
): string | null {
  for (const family of parseCSSFontFamilies(value)) {
    const generic = GENERIC_FAMILIES[family.trim().toLowerCase()]
    if (generic) return defaultFamily(generic, options)
    if (options.isAvailable && !options.isAvailable(family)) continue
    return family
  }
  return null
}

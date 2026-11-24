import {
  GENERIC_FONT_FAMILIES_BY_CLASS,
  genericFontFamilyClass,
  parseCSSFontFamilies,
  type GenericFontClass
} from '@pairdraw/scene-graph/css'

export interface FontStackOptions {
  /**
   * Whether the document can draw a family, such as the font service answering. Without it every
   * concrete family is taken as available, as a headless import has no faces to ask.
   */
  isAvailable?: (family: string) => boolean
}

function defaultFamily(kind: GenericFontClass, options: FontStackOptions): string {
  const candidates = GENERIC_FONT_FAMILIES_BY_CLASS[kind]
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
    const kind = genericFontFamilyClass(family)
    if (kind) return defaultFamily(kind, options)
    if (options.isAvailable && !options.isAvailable(family)) continue
    return family
  }
  return null
}

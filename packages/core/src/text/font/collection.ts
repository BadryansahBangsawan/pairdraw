import type {
  CanvasKit,
  FontCollection,
  ParagraphBuilder,
  ParagraphStyle,
  TypefaceFontProvider
} from 'canvaskit-wasm'

/**
 * The font collection each provider's paragraphs are built with, made once and again only when
 * the provider gains a font.
 *
 * `ParagraphBuilder.MakeFromFontProvider` makes a new collection for every paragraph, and each new
 * collection instantiates a variable font's axes on a new typeface clone. CanvasKit keeps part of
 * every clone, in proportion to the font's glyphs: about 64 KB a paragraph for Noto Sans SC, so a
 * document of some 30,000 Chinese texts filled the 2 GB heap and aborted while it opened. A shared
 * collection makes each instance once.
 *
 * A collection keeps the families it has looked up, the ones it did not find included, so a font
 * registered in the provider afterwards needs a new one: {@link resetFontCollection}.
 *
 * Paragraphs with half leading and without it get a collection each: a collection's paragraph cache
 * keys shaped text without its style's half leading, so a paragraph would take the line metrics of
 * an earlier one that differs only there.
 */
const collections = new WeakMap<TypefaceFontProvider, Map<boolean, FontCollection>>()

/** A paragraph builder drawing from `provider`, through the collection its paragraphs share. */
export function makeParagraphBuilder(
  ck: CanvasKit,
  style: ParagraphStyle,
  provider: TypefaceFontProvider
): ParagraphBuilder {
  const halfLeading = style.textStyle?.halfLeading ?? false
  let shared = collections.get(provider)
  if (!shared) {
    shared = new Map()
    collections.set(provider, shared)
  }
  let collection = shared.get(halfLeading)
  if (!collection) {
    collection = ck.FontCollection.Make()
    collection.setDefaultFontManager(provider)
    collection.enableFontFallback()
    shared.set(halfLeading, collection)
  }
  return ck.ParagraphBuilder.MakeFromFontCollection(style, collection)
}

/**
 * Lets `provider`'s next paragraph look its families up again: call it after registering a font
 * in the provider, and before deleting the provider. Paragraphs built already keep the collection
 * they were built with until they are deleted.
 */
export function resetFontCollection(provider: TypefaceFontProvider): void {
  const shared = collections.get(provider)
  if (!shared) return
  collections.delete(provider)
  for (const collection of shared.values()) collection.delete()
}

import * as v from 'valibot'

import { figFontsManifestSchema } from './schema'

/** A document font as a `.fig` archive stores it: its entry name and bytes. */
export interface FigFontEntry {
  name: string
  data: Uint8Array
}

/** A document font with the family and style its text draws in. */
export interface FigDocumentFont {
  family: string
  style: string
  data: Uint8Array
}

const FONT_EXTENSIONS = ['ttf', 'otf', 'woff', 'woff2'] as const
/** The file extension of a font format a document can carry. */
export type FontFileExtension = (typeof FONT_EXTENSIONS)[number]

/**
 * A font file's extension, read from its signature: TrueType, OpenType, WOFF, or WOFF2. Null for
 * bytes that are none of them.
 */
export function fontFileExtension(data: Uint8Array): FontFileExtension | null {
  if (data.byteLength < 4) return null
  const signature = (data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]
  switch (signature) {
    case 0x00010000:
    case 0x74727565:
      return 'ttf'
    case 0x4f54544f:
      return 'otf'
    case 0x774f4646:
      return 'woff'
    case 0x774f4632:
      return 'woff2'
    default:
      return null
  }
}

/**
 * The `fonts/` entries a document's fonts are written as: `fonts/<index>.<ext>`, one per style,
 * so the bytes round-trip without trusting file names a host gave them.
 */
export function figFontEntries(
  fonts: ReadonlyArray<{ family: string; style: string; data: Uint8Array | ArrayBuffer }>
): Array<FigFontEntry & { family: string; style: string }> {
  return fonts.flatMap(({ family, style, data }, index) => {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const extension = fontFileExtension(bytes)
    if (!extension) return []
    return [{ name: `fonts/${index}.${extension}`, data: bytes, family, style }]
  })
}

/** The manifest text for `entries`, in entry order. */
export function figFontsManifest(
  entries: ReadonlyArray<{ name: string; family: string; style: string }>
): string {
  return JSON.stringify(entries.map(({ name, family, style }) => ({ file: name, family, style })))
}
/**
 * A manifest's fonts with their bytes from `files`, validated entry by entry so one bad entry
 * drops only itself: entries whose file is missing or whose bytes are not the font format the
 * entry names are skipped.
 */
export function resolveFigFonts(
  manifestText: string,
  files: ReadonlyMap<string, Uint8Array>
): FigDocumentFont[] {
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), v.array(v.unknown())), manifestText)
  if (!parsed.success) return []
  const entrySchema = figFontsManifestSchema.item
  const fonts: FigDocumentFont[] = []
  for (const item of parsed.output) {
    const entry = v.safeParse(entrySchema, item)
    if (!entry.success) continue
    const { file, family, style } = entry.output
    const data = files.get(file)
    if (!data) continue
    const view = new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    if (fontFileExtension(view) !== file.slice(file.lastIndexOf('.') + 1)) continue
    fonts.push({ family, style, data })
  }
  return fonts
}

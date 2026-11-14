import * as v from 'valibot'

import { readFigArchiveParts, resolveFigFonts, type FigArchiveParts } from '@pairdraw/fig'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { fontManager } from '#core/text/font/manager'
import { sfntFamilyNames } from '#core/text/font/variation'
import { sfntFont } from '#core/text/font/woff2'

/** A font file dropped for a document, with the family and style it was registered under. */
export interface DocumentFontEntry {
  family: string
  style: string
  data: ArrayBuffer
}

/** What a caller supplies for a font file: its bytes, with optional names overriding the file's. */
export interface DocumentFontInput {
  data: ArrayBuffer
  family?: string
  style?: string
}

const MAX_DOCUMENT_FONT_BYTES = 64 * 1024 * 1024

const FONT_SIGNATURES = [
  [0x00, 0x01, 0x00, 0x00],
  [0x4f, 0x54, 0x54, 0x4f],
  [0x74, 0x72, 0x75, 0x65],
  [0x77, 0x4f, 0x46, 0x46],
  [0x77, 0x4f, 0x46, 0x32]
] as const

function hasFontSignature(data: ArrayBuffer): boolean {
  if (data.byteLength < 4) return false
  const bytes = new Uint8Array(data, 0, 4)
  return FONT_SIGNATURES.some((signature) =>
    signature.every((byte, index) => bytes[index] === byte)
  )
}

/** A name a font file gives itself, or an overriding name a caller supplies. */
const fontNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))

const documentFontInputSchema = v.object({
  family: v.optional(fontNameSchema),
  style: v.optional(fontNameSchema),
  data: v.pipe(
    v.custom<ArrayBuffer>((value) => value instanceof ArrayBuffer, 'Expected an ArrayBuffer'),
    v.check((data) => data.byteLength > 0, 'Expected a non-empty font file'),
    v.check(
      (data) => data.byteLength <= MAX_DOCUMENT_FONT_BYTES,
      'Expected a font file of at most 64 MB'
    ),
    v.check((data) => hasFontSignature(data), 'Expected a TrueType, OpenType, WOFF, or WOFF2 font')
  )
})

/** The fonts a document carries, by `family|style`. */
const documentFonts = new WeakMap<SceneGraph, Map<string, DocumentFontEntry>>()

function fontsOf(graph: SceneGraph): Map<string, DocumentFontEntry> {
  let fonts = documentFonts.get(graph)
  if (!fonts) {
    fonts = new Map()
    documentFonts.set(graph, fonts)
  }
  return fonts
}

/** The fonts registered for the document, each style once, in registration order. */
export function documentFontsOf(graph: SceneGraph): DocumentFontEntry[] {
  return [...(documentFonts.get(graph)?.values() ?? [])]
}

/**
 * Registers font files for the document, so its text draws in them wherever the document opens.
 * Names default to the ones the file gives itself; entries that fail validation are skipped and
 * reported, so one bad file does not drop the rest.
 */
export async function registerDocumentFonts(
  graph: SceneGraph,
  inputs: readonly DocumentFontInput[]
): Promise<{ registered: DocumentFontEntry[]; skipped: number }> {
  const registered: DocumentFontEntry[] = []
  let skipped = 0
  for (const input of inputs) {
    const parsed = v.safeParse(documentFontInputSchema, input)
    if (!parsed.success) {
      skipped += 1
      continue
    }
    const sfnt = await sfntFont(parsed.output.data)
    const names = sfntFamilyNames(sfnt) ?? sfntFamilyNames(parsed.output.data)
    const family = parsed.output.family ?? names?.family
    const style = parsed.output.style ?? names?.style ?? 'Regular'
    if (!family) {
      skipped += 1
      continue
    }
    const data = parsed.output.data.slice(0)
    await fontManager.markLoaded(family, style, data, 'registered')
    const entry = { family, style, data }
    fontsOf(graph).set(`${family}|${style}`, entry)
    registered.push(entry)
  }
  return { registered, skipped }
}

/**
 * Registers the document's fonts again, after a reload or a fresh font manager, so its text keeps
 * drawing in them. Answers how many it re-registered.
 */
export async function prepareDocumentFonts(graph: SceneGraph): Promise<number> {
  let prepared = 0
  for (const { family, style, data } of documentFontsOf(graph)) {
    if (fontManager.isStyleLoaded(family, style)) {
      prepared += 1
      continue
    }
    await fontManager.markLoaded(family, style, data.slice(0), 'registered')
    prepared += 1
  }
  return prepared
}

/**
 * The archive's fonts merged with the document's: the document's fonts win each family and style
 * they name, so a font added since the archive was written joins the ones it holds. Answers null
 * when the document adds no font the archive lacks, so the writer keeps the archive's entries.
 */
export function mergeArchiveFonts(
  graph: SceneGraph,
  archive: Uint8Array
): Array<{ family: string; style: string; data: Uint8Array | ArrayBuffer }> | null {
  const docFonts = documentFontsOf(graph)
  if (docFonts.length === 0) return null
  let parts: FigArchiveParts
  try {
    parts = readFigArchiveParts(archive.slice().buffer)
  } catch {
    return [...docFonts]
  }
  const files = new Map(parts.fonts.map(([name, data]) => [`fonts/${name}`, data]))
  const archived = parts.fontsJSON ? resolveFigFonts(parts.fontsJSON, files) : []
  const known = new Set(archived.map(({ family, style }) => `${family}|${style}`))
  const fresh = docFonts.filter(({ family, style }) => !known.has(`${family}|${style}`))
  if (fresh.length === 0) return null
  return [...archived, ...fresh]
}

/**
 * The bytes of a document font face, for writers that ship the document's fonts with it. Only
 * faces registered from font files (`registered`), never downloaded subsets or system fonts the
 * writer cannot ship. Answers null when the family has no such face of `style`.
 */
export function documentFontData(family: string, style: string): Uint8Array | null {
  if (fontManager.loadedFontSource(family, style) !== 'registered') return null
  const data = fontManager.loadedData(family, style)
  return data ? new Uint8Array(data) : null
}

const FONT_FILE_PATTERN = /\.(ttf|otf|woff|woff2)$/i

/** Whether a file name looks like a font file a document can carry. */
export function isDocumentFontFileName(name: string): boolean {
  return FONT_FILE_PATTERN.test(name)
}

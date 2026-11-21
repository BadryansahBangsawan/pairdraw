import { groupBy } from 'es-toolkit'

import {
  buildPenGraph,
  isDataURL,
  parseImportedImageURL,
  parsePenDocument,
  penAssets,
  withUsedImports,
  writePenDocument,
  type PenIconRequest,
  type PenIconSource
} from '@pairdraw/pen'

import { defaultIcons, drawIcon, type IconData, type IconProvider } from '#core/icons'
import type { IOFormatAdapter, ReadDocumentInput, ReadDocumentWarning } from '#core/io/types'
import { layoutAuthoredNodes } from '#core/layout'

import { loadPenFonts } from './fonts'
import { loadPenImports, readImportedImage, UnresolvedImports, type OpenedImport } from './imports'

/** The size icons are fetched at; each is scaled to the box it is drawn in. */
const PEN_ICON_SIZE = 24

/** How many names one warning lists, so a broken document cannot flood the host's notice. */
const WARNING_NAMES = 10

/** One warning for the names found, capped, or none when nothing was found. */
function warningList<K extends 'unknown-variable' | 'missing-image' | 'unknown-node'>(
  kind: K,
  field: K extends 'unknown-variable' ? 'names' : K extends 'missing-image' ? 'urls' : 'types',
  names: ReadonlySet<string>
): ReadDocumentWarning[] {
  return names.size > 0 ? [{ kind, [field]: [...names].slice(0, WARNING_NAMES) } as ReadDocumentWarning] : []
}

/**
 * The path a percent-encoded image URL names, decoded one step at a time: a step that would become
 * a separator or a parent keeps its escape, so a URL cannot name a file outside its folder.
 */
function decodeAssetPath(url: string): string {
  return url
    .split('/')
    .map((segment) => {
      let decoded: string
      try {
        decoded = decodeURIComponent(segment)
      } catch {
        return segment
      }
      if (decoded === '.' || decoded === '..') return segment
      return decoded.replaceAll('/', '%2F').replaceAll('\\', '%5C')
    })
    .join('/')
}

/**
 * An image's bytes: a data URL decoded by the platform's own URL handling, an imported document's
 * file beside that document, and any other file through the host; null when that fails.
 */
async function loadPenFile(
  url: string,
  input: ReadDocumentInput,
  opened: ReadonlyMap<string, OpenedImport>
): Promise<Uint8Array | null> {
  try {
    if (parseImportedImageURL(url)) return await readImportedImage(opened, url)
    // pen.dev writes the path percent-encoded, as `My%20Design-assets/…`.
    if (!isDataURL(url)) return (await input.readAsset?.(decodeAssetPath(url))) ?? null
    // Through `URL`, which lowercases the scheme for runtimes that only fetch `data:`.
    return new Uint8Array(await (await fetch(new URL(url))).arrayBuffer())
  } catch {
    return null
  }
}

/**
 * The shader files the document's paints and effects name, as their source text. One whose file the
 * host cannot read is left out, so its shader draws nothing rather than an empty frame.
 */
async function loadPenShaders(
  urls: readonly string[],
  input: ReadDocumentInput,
  opened: ReadonlyMap<string, OpenedImport>
): Promise<Map<string, string>> {
  const shaders = new Map<string, string>()
  await Promise.all(
    urls.map(async (url) => {
      const bytes = await loadPenFile(url, input, opened)
      if (bytes) shaders.set(url, new TextDecoder().decode(bytes))
    })
  )
  return shaders
}

/** The images the host has, and the URLs it does not, whose paints are dropped. */
async function loadPenImages(
  urls: readonly string[],
  input: ReadDocumentInput,
  opened: ReadonlyMap<string, OpenedImport>
): Promise<{ images: Map<string, Uint8Array>; missing: Set<string> }> {
  const images = new Map<string, Uint8Array>()
  const missing = new Set<string>()
  await Promise.all(
    urls.map(async (url) => {
      const bytes = await loadPenFile(url, input, opened)
      if (bytes) images.set(url, bytes)
      else missing.add(url)
    })
  )
  return { images, missing }
}

/** A request's options as a key, so requests drawn the same way share a fetch. */
const optionsKey = (options: Record<string, number> | undefined) => JSON.stringify(options ?? null)

/**
 * Icons from `provider`, fetched once for each way they are drawn; a document whose icons cannot
 * be fetched opens with empty icons.
 */
async function loadPenIcons(
  requests: readonly PenIconRequest[],
  provider: IconProvider
): Promise<PenIconSource> {
  const glyphs = new Map<string, IconData>()
  const byOptions = groupBy(requests, (request) => optionsKey(request.options))
  await Promise.all(
    Object.values(byOptions).map(async (group) => {
      const names = group.map((request) => request.name)
      const found = await provider
        .icons(names, PEN_ICON_SIZE, group[0]?.options)
        .catch(() => new Map<string, IconData>())
      for (const [name, icon] of found)
        glyphs.set(`${name}\0${optionsKey(group[0]?.options)}`, icon)
    })
  )
  return {
    draw(graph, frameId, name, size, color, options) {
      const icon = glyphs.get(`${name}\0${optionsKey(options)}`)
      if (!icon) return false
      drawIcon(graph, frameId, icon, size, color)
      return true
    }
  }
}

export const penFormat: IOFormatAdapter<'pen'> = {
  id: 'pen',
  label: 'Pencil Document',
  role: 'interchange-document',
  category: 'document',
  extensions: ['pen'],
  mimeTypes: ['application/json', 'text/plain'],
  support: {
    readDocument: true,
    writeDocument: true
  },
  laysOutOnRead: true,
  matchesFile(fileName, mimeType) {
    return fileName.toLowerCase().endsWith('.pen') || mimeType === 'application/json'
  },
  async readDocument(input, context) {
    const doc = parsePenDocument(new TextDecoder().decode(input.data))
    // The libraries it imports, whose components it uses draw as library components; what the host
    // cannot read draws as placeholders the warnings tell the host about.
    const unresolved = new UnresolvedImports()
    const unknownVariables = new Set<string>()
    const { imports, opened } = await loadPenImports(doc, input, unresolved)
    const importsIncomplete = unresolved.warnings().length > 0
    const assets = penAssets(withUsedImports(doc, imports))
    const [{ images, missing }, shaders, icons, fonts] = await Promise.all([
      loadPenImages(assets.images, input, opened),
      loadPenShaders(assets.shaders, input, opened),
      loadPenIcons(assets.icons, context?.icons ?? defaultIcons),
      loadPenFonts(doc.fonts ?? [], (url) => loadPenFile(url, input, opened))
    ])
    // A .pen file stores its layout intent, not the sizes and positions it implies; the hidden
    // library page's components are laid out too, as instances of them copy their layers.
    const graph = buildPenGraph(doc, {
      images,
      shaders,
      icons,
      fonts,
      imports,
      onUnknownVariable: (name) => {
        // A variable of a library that opened without its own imports is covered by that warning.
        if (name.includes(':') && importsIncomplete) return
        unknownVariables.add(name)
      },
      layout: (target) =>
        layoutAuthoredNodes(
          target,
          target.getPages(true).map((page) => page.id)
        )
    })
    const warnings: ReadDocumentWarning[] = [
      ...unresolved.warnings(),
      ...warningList('unknown-variable', 'names', unknownVariables),
      ...warningList('missing-image', 'urls', missing)
    ]
    return warnings.length > 0
      ? { graph, sourceFormat: 'pen', warnings }
      : { graph, sourceFormat: 'pen' }
  },
  async writeDocument(graph) {
    return {
      format: 'pen',
      mimeType: 'application/json',
      extension: 'pen',
      data: writePenDocument(graph),
      encoding: 'utf8'
    }
  }
}

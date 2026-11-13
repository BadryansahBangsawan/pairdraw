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
} from '@open-pencil/pen'

import { defaultIcons, drawIcon, type IconData, type IconProvider } from '#core/icons'
import type { IOFormatAdapter, ReadDocumentInput } from '#core/io/types'
import { layoutAuthoredNodes } from '#core/layout'

import { loadPenImports, readImportedImage, UnresolvedImports, type OpenedImport } from './imports'

/** The size icons are fetched at; each is scaled to the box it is drawn in. */
const PEN_ICON_SIZE = 24

/**
 * An image's bytes: a data URL decoded by the platform's own URL handling, an imported document's
 * file beside that document, and any other file through the host; null when that fails.
 */
async function loadPenImage(
  url: string,
  input: ReadDocumentInput,
  opened: ReadonlyMap<string, OpenedImport>
): Promise<Uint8Array | null> {
  try {
    if (parseImportedImageURL(url)) return await readImportedImage(opened, url)
    if (!isDataURL(url)) return (await input.readAsset?.(url)) ?? null
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
      const bytes = await loadPenImage(url, input, opened)
      if (bytes) shaders.set(url, new TextDecoder().decode(bytes))
    })
  )
  return shaders
}

async function loadPenImages(
  urls: readonly string[],
  input: ReadDocumentInput,
  opened: ReadonlyMap<string, OpenedImport>
): Promise<Map<string, Uint8Array>> {
  const images = new Map<string, Uint8Array>()
  await Promise.all(
    urls.map(async (url) => {
      const bytes = await loadPenImage(url, input, opened)
      if (bytes) images.set(url, bytes)
    })
  )
  return images
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
    const { imports, opened } = await loadPenImports(doc, input, unresolved)
    const assets = penAssets(withUsedImports(doc, imports))
    const [images, shaders, icons] = await Promise.all([
      loadPenImages(assets.images, input, opened),
      loadPenShaders(assets.shaders, input, opened),
      loadPenIcons(assets.icons, context?.icons ?? defaultIcons)
    ])
    // A .pen file stores its layout intent, not the sizes and positions it implies; the hidden
    // library page's components are laid out too, as instances of them copy their layers.
    const graph = buildPenGraph(doc, {
      images,
      shaders,
      icons,
      imports,
      layout: (target) =>
        layoutAuthoredNodes(
          target,
          target.getPages(true).map((page) => page.id)
        )
    })
    const warnings = unresolved.warnings()
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

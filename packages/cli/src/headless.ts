import { readFile, realpath } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

import { syncEditedComponents } from '@pairdraw/core'
import { SkiaRenderer } from '@pairdraw/core/canvas'
import {
  BUILTIN_IO_FORMATS,
  IORegistry,
  type ReadDocumentInput,
  type ReadDocumentWarning
} from '@pairdraw/core/io'
import {
  figThumbnailPageId,
  pendingFigPageOfNode,
  populateAllFigPages,
  populateFigPage
} from '@pairdraw/core/io/formats/fig'
import { headlessHTMLReader } from '@pairdraw/core/io/formats/html/import'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { computeAllLayouts, installTextMeasurer, sizeAutoResizingText } from '@pairdraw/core/layout'
import { writeFileAtomic } from '@pairdraw/core/node/fs'
import { prepareGraphFonts, type DocumentFontStatus } from '@pairdraw/core/text'
import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  collectSceneMutation,
  createSceneMutationImpact,
  recordSceneMutations
} from '@pairdraw/scene-graph/mutation-impact'

import type { RequestedPage } from '#cli/app/target'
import { printError, warn } from '#cli/format'

export { initCanvasKit }

/** The document formats the CLI reads and writes, with HTML read by the headless CSS runtime. */
export const CLI_IO_FORMATS = [...BUILTIN_IO_FORMATS, headlessHTMLReader]

const io = new IORegistry(CLI_IO_FORMATS)

/**
 * Reads a file a document names relative to itself, only from the document's folder: a path that
 * leaves it, through `..` or a link, reads nothing.
 */
function documentAssetReader(filePath: string) {
  return async (path: string): Promise<Uint8Array | null> => {
    const folder = await realpath(dirname(filePath))
    const target = await realpath(resolve(folder, path)).catch(() => null)
    if (!target?.startsWith(folder + sep)) return null
    return new Uint8Array(await readFile(target))
  }
}

/** Only documents a document imports are read for it this way: `.pen` libraries. */
const IMPORTABLE_DOCUMENT = /\.pen$/i

/** Whether `path` lies in `folder` or deeper. */
const isWithin = (folder: string, path: string) => path === folder || path.startsWith(folder + sep)

/**
 * Opens the `.pen` libraries a document imports, by their path relative to it. They may sit
 * outside its folder, as a shared library does, but not outside the working directory a
 * repository's tooling runs in; a document outside the working directory imports only from its own
 * folder. Each reads its own images beside itself and its own imports relative to itself.
 */
function documentImportOpener(filePath: string): ReadDocumentInput['openImport'] {
  return async (path) => {
    const folder = await realpath(dirname(filePath))
    const cwd = await realpath(process.cwd())
    const root = isWithin(cwd, folder) ? cwd : folder
    const target = await realpath(resolve(folder, path)).catch(() => null)
    if (!target || !isWithin(root, target) || !IMPORTABLE_DOCUMENT.test(target)) return null
    return {
      name: target,
      data: new Uint8Array(await readFile(target)),
      readAsset: documentAssetReader(target),
      openImport: documentImportOpener(target)
    }
  }
}

/** Tells the user on stderr what a document opened without, keeping stdout for the output. */
function printReadWarnings(filePath: string, warnings: readonly ReadDocumentWarning[] = []): void {
  for (const warning of warnings) {
    if (warning.kind === 'unknown-variable') {
      console.error(
        warn(
          `${filePath}: references variables it does not define (${warning.names.join(', ')}); they read as their fallbacks.`
        )
      )
      continue
    }
    if (warning.kind === 'missing-image') {
      console.error(
        warn(
          `${filePath}: names image files it cannot read (${warning.urls.join(', ')}); their fills are left out.`
        )
      )
      continue
    }
    if (warning.kind === 'unknown-node') {
      console.error(
        warn(
          `${filePath}: uses node types it does not know (${warning.types.join(', ')}); they read as placeholder frames.`
        )
      )
      continue
    }
    console.error(
      warn(
        `${filePath}: could not open the libraries it imports (${warning.paths.join(', ')}); their components read as placeholders.`
      )
    )
  }
}

export async function loadDocument(filePath: string): Promise<SceneGraph> {
  const bytes = new Uint8Array(await readFile(filePath))
  // A format laid out as it is read places its layers by their text's size, which is measured
  // as an export draws it rather than estimated.
  if (io.findReader(filePath)?.laysOutOnRead) await measureTextHeadlessly()
  const { graph, warnings } = await io.readDocument({
    // The path its imports resolve to, so an import leading back to it is recognized.
    name: await realpath(filePath),
    data: bytes,
    readAsset: documentAssetReader(filePath),
    openImport: documentImportOpener(filePath)
  })
  printReadWarnings(filePath, warnings)
  graph.applyDerivedLayoutDuring(() => computeAllLayouts(graph))
  return graph
}

let textMeasurer: Promise<void> | null = null

/**
 * Measure text a script or tool lays out with CanvasKit and the fonts it loads, as the app
 * does, instead of the estimate that knows neither line breaks nor wrapping. The document as
 * loaded keeps the layout its file gives it; only edits made afterwards are measured.
 */
export function measureTextHeadlessly(): Promise<void> {
  textMeasurer ??= (async () => {
    const ck = await initCanvasKit()
    const surface = ck.MakeSurface(1, 1)
    if (!surface) throw new Error('CanvasKit could not make a surface to measure text')
    const renderer = new SkiaRenderer(ck, surface)
    await renderer.loadFonts()
    installTextMeasurer((node, maxWidth) => renderer.measureTextNode(node, maxWidth))
  })().catch((error: unknown) => {
    textMeasurer = null
    throw error
  })
  return textMeasurer
}

/**
 * Measures the text an edit to `graph` lays out as `measureTextHeadlessly` does, in the fonts the
 * document uses: a weight or family the measurer does not start with is otherwise measured in a
 * stand-in, and the edited layer comes out taller or wider than the app draws it. Returns which
 * of those fonts could not be loaded.
 */
export async function measureDocumentText(graph: SceneGraph): Promise<DocumentFontStatus> {
  await measureTextHeadlessly()
  return prepareGraphFonts(
    graph,
    graph.getPages(true).map((page) => page.id)
  )
}

/** `--write` and `--output` for commands that change a headless document. */
export const documentWriteOptions = {
  write: { type: 'boolean', alias: 'w', description: 'Write changes back to the input file' },
  output: { type: 'string', alias: 'o', description: 'Write to a different file', required: false }
} as const

/**
 * Save a headless document in the format its file name names: a `.pen` document written back to
 * its own path stays JSON, and `--output out.pen` converts. `format` overrides the name, so
 * `convert --format` writes what it asked for.
 */
export async function writeDocumentFile(
  graph: SceneGraph,
  filePath: string,
  format?: string
): Promise<void> {
  const adapter = format ? io.getFormat(format) : io.findWriter(filePath)
  if (!adapter?.support.writeDocument) {
    const writable = io
      .listWritableFormats()
      .map((candidate) => candidate.id)
      .join(', ')
    throw new Error(`Cannot write ${filePath}: its name asks for no document format (${writable})`)
  }
  // The thumbnail draws the Cover page, which a script run on one page may not have loaded.
  if (adapter.id === 'fig') {
    const cover = figThumbnailPageId(graph.getPages())
    if (cover) await loadDocumentPage(graph, cover)
  }
  const result = await io.writeDocument(adapter.id, graph, {
    renderThumbnail: adapter.id === 'fig'
  })
  for (const message of result.warnings ?? []) console.error(warn(message))
  const data = result.encoding === 'utf8' ? (result.data as string) : (result.data as Uint8Array)
  await writeFileAtomic(filePath, data, { symlink: 'follow' })
}

export function populateDocumentPage(graph: SceneGraph, pageId: string): boolean {
  const changed = populateFigPage(graph, pageId)
  if (changed) graph.applyDerivedLayoutDuring(() => computeAllLayouts(graph, pageId))
  return changed
}

/** Loads a page not loaded yet with the fonts its text uses, as the editor prepares a page. */
export async function loadDocumentPage(graph: SceneGraph, pageId: string): Promise<void> {
  if (populateDocumentPage(graph, pageId)) await prepareGraphFonts(graph, [pageId])
}

export function populateWholeDocument(graph: SceneGraph): boolean {
  const changed = populateAllFigPages(graph)
  if (changed) graph.applyDerivedLayoutDuring(() => computeAllLayouts(graph))
  return changed
}

/**
 * Loads the page holding the layer `nodeId`, which the archive finds by the layer's record, and
 * every page for a layer with no record of its own, such as one inside an instance.
 */
export async function populateNodePage(graph: SceneGraph, nodeId: string): Promise<void> {
  const pageId = await pendingFigPageOfNode(graph, nodeId)
  if (pageId) await loadDocumentPage(graph, pageId)
  else if (!graph.getNode(nodeId)) populateWholeDocument(graph)
}

/** A string argument of an RPC command, such as its `page` or `format`. */
function stringArg(args: unknown, key: string): string | undefined {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return undefined
  const value: unknown = Reflect.get(args, key)
  return typeof value === 'string' ? value : undefined
}

/** The page an RPC command's `page_id` or `page` names, as the command picks it. */
function rpcPage(args: unknown): RequestedPage | undefined {
  const id = stringArg(args, 'page_id')
  if (id) return { id }
  const name = stringArg(args, 'page')
  return name ? { name } : undefined
}

function findPage(graph: SceneGraph, page: RequestedPage) {
  return graph
    .getPages()
    .find((candidate) => ('id' in page ? candidate.id === page.id : candidate.name === page.name))
}

function populateRequestedPage(graph: SceneGraph, requested?: RequestedPage): void {
  const page = requested ? findPage(graph, requested) : graph.getPages()[0]
  if (page) populateDocumentPage(graph, page.id)
}

export function prepareDocumentForRPC(graph: SceneGraph, command: string, args?: unknown): void {
  if (command === 'pages' || command === 'variables') return
  // A stylesheet holds only variables, which load with the document; pages can take minutes.
  if (command === 'tokens' && stringArg(args, 'format') !== 'dtcg') return
  if (command === 'tree' || command === 'analyze_overlaps') {
    populateRequestedPage(graph, rpcPage(args))
    return
  }
  if (command === 'find' || command === 'query') {
    const page = rpcPage(args)
    if (page) populateRequestedPage(graph, page)
    else populateWholeDocument(graph)
    return
  }
  populateWholeDocument(graph)
}

/** The page `--page` or `--page-id` names, or the first page without either. */
export function requirePage(graph: SceneGraph, requested?: RequestedPage) {
  const pages = graph.getPages()
  const page = requested ? findPage(graph, requested) : pages[0]
  if (!page) {
    const label = requested && ('id' in requested ? requested.id : requested.name)
    const available = pages
      .map((candidate) => `"${requested && 'id' in requested ? candidate.id : candidate.name}"`)
      .join(', ')
    printError(
      label
        ? `Page "${label}" not found. Available pages: ${available || 'none'}.`
        : 'Document has no pages.'
    )
    process.exit(1)
  }
  return page
}

/**
 * Runs `edit` on `graph`, then loads the fonts the text it touched needs and sizes that text again
 * in them. Text is sized as it is edited, before the fonts for new characters (Japanese in a
 * Latin-only web font, say) can load, so without this it would save the size and glyphs of a
 * stand-in. The instances of the components it changed then follow them, as the editor's
 * component sync makes them.
 */
export async function editDocument<T>(graph: SceneGraph, edit: () => T | Promise<T>): Promise<T> {
  const authored = createSceneMutationImpact()
  // Layout's writes and pages loading are results, not edits, as the editor's sync treats them.
  const stopRecording = recordSceneMutations(
    graph,
    authored,
    () => !graph.isApplyingLayout && !graph.isApplyingImportedState
  )
  try {
    const { result, impact } = await collectSceneMutation(graph, edit)
    const textIds = [...impact.changedNodeIds].filter((id) => graph.getNode(id)?.type === 'TEXT')
    if (textIds.length > 0) {
      await prepareGraphFonts(graph, textIds)
      for (const id of textIds) sizeAutoResizingText(graph, id)
    }
    syncEditedComponents(graph, [...authored.changedNodeIds, ...authored.previousParentIds])
    return result
  } finally {
    stopRecording()
  }
}

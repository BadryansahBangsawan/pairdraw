import { FigmaAPI } from '@pairdraw/core/figma-api'
import { pendingFigPageOfNode } from '@pairdraw/core/io/formats/fig'
import { headlessHTMLStyler } from '@pairdraw/core/io/formats/html/import'
import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit
} from '@pairdraw/core/io/formats/raster'
import { createFFmpegEncoder } from '@pairdraw/core/node/video'
import {
  ALL_TOOLS,
  registerHTMLToolHost,
  registerVideoEncoder,
  type ToolDef
} from '@pairdraw/core/tools'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { isAppMode, requireFile, rpc } from '#cli/app/client'
import { appPageTargetRPCArgs, requestedPage, type PageCLIArgs } from '#cli/app/target'
import {
  editDocument,
  loadDocument,
  loadDocumentPage,
  measureDocumentText,
  populateDocumentPage,
  populateWholeDocument,
  requirePage
} from '#cli/headless'

/**
 * A Figma API over a headless document, with CanvasKit raster export and pixel decoding. A page
 * not loaded yet loads with its fonts when the script asks for it, as in Figma's dynamic-page mode.
 */
export async function createHeadlessFigma(graph: SceneGraph): Promise<FigmaAPI> {
  const figma = new FigmaAPI(graph, {
    loadPage: (id) => loadDocumentPage(graph, id),
    pageOfNode: (id) => pendingFigPageOfNode(graph, id)
  })
  figma.exportImage = (nodeIds, options) =>
    headlessRenderNodes(graph, options.pageId ?? figma.currentPageId, nodeIds, options)
  figma.rasterCodec = createCanvasKitRasterCodec(await initCanvasKit())
  // Bun has no WebCodecs, so MP4 and WebM go through an ffmpeg on the path when there is one.
  registerVideoEncoder(graph, createFFmpegEncoder())
  // Node reads Tailwind's stylesheets from the installed package, so export needs no loader.
  registerHTMLToolHost(graph, { style: headlessHTMLStyler })
  return figma
}

/** A document file loaded for headless tool calls, with the Figma API the tools run on. */
export interface HeadlessToolDocument {
  graph: SceneGraph
  figma: FigmaAPI
}

/**
 * Opens a document file for a script or a tool with every page loaded, or with only the page
 * `--page` or `--page-id` names, which then is the current page; the script loads the others as it
 * asks for them.
 */
export async function openHeadlessFigma(
  file: string,
  pageArgs: PageCLIArgs = {}
): Promise<HeadlessToolDocument> {
  const requested = requestedPage(pageArgs)
  const graph = await loadDocument(file)
  const pageId = requested ? requirePage(graph, requested).id : undefined
  if (pageId) populateDocumentPage(graph, pageId)
  else populateWholeDocument(graph)
  await measureDocumentText(graph)
  const figma = await createHeadlessFigma(graph)
  if (pageId) figma.currentPage = figma.wrapNode(pageId)
  return { graph, figma }
}

/** Loads `file` with every page populated and its text measured, ready for tool calls. */
export async function loadHeadlessToolDocument(
  file: string,
  pageArgs: PageCLIArgs = {}
): Promise<HeadlessToolDocument> {
  return openHeadlessFigma(file, pageArgs)
}

/** Runs `tool` on a headless document: loads its fonts, then sizes the text it changes. */
export async function runHeadlessTool(
  headless: HeadlessToolDocument,
  tool: ToolDef,
  args: Record<string, unknown>
): Promise<unknown> {
  await tool.loadFonts(headless.figma, args)
  return editDocument(headless.graph, () => tool.execute(headless.figma, args))
}

/**
 * Run a Core tool against the running app, or headlessly against a document file, on the page
 * `--page` or `--page-id` names, which in a file is then the only page loaded. Headless runs
 * return the loaded graph so mutating commands can write it back.
 */
export async function runToolData(
  file: string | undefined,
  name: string,
  args: Record<string, unknown>,
  targetArgs: PageCLIArgs = {}
): Promise<{ result: unknown; graph: SceneGraph | null }> {
  if (isAppMode(file)) {
    const target = await appPageTargetRPCArgs(targetArgs)
    return { result: await rpc('tool', { ...target, name, args }), graph: null }
  }
  const tool = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  const headless = await openHeadlessFigma(requireFile(file), targetArgs)
  return { result: await runHeadlessTool(headless, tool, args), graph: headless.graph }
}

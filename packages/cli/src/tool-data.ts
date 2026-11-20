import { applyDocumentChange, recordDocumentChange } from '@pairdraw/core'
import {
  createDesignGuard,
  DesignMemoryRefusalError,
  type DesignMemoryMode
} from '@pairdraw/core/design-memory'
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
  figma.exportGraphImage = (target, pageId, nodeIds, options) =>
    headlessRenderNodes(target, pageId, nodeIds, options)
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

/**
 * How a headless call answers to the document's design memory. A person's call, from `tool
 * call`, `shell` or `eval`, is only warned unless they ask for enforcement; `pairdraw agent` runs
 * an agent, whose off-system edit is refused and put back.
 */
export interface HeadlessToolOptions {
  designMemory?: DesignMemoryMode
}

/**
 * Runs `tool` on a headless document: loads its fonts, then sizes the text it changes. What it
 * changed answers to the document's design memory: a refused edit is put back and the call
 * answers with the refusal, as the app answers an agent; a warned one carries its warnings.
 */
export async function runHeadlessTool(
  headless: HeadlessToolDocument,
  tool: ToolDef,
  args: Record<string, unknown>,
  options: HeadlessToolOptions = {}
): Promise<unknown> {
  await tool.loadFonts(headless.figma, args)
  const { graph, figma } = headless
  const recorder = tool.mutates ? recordDocumentChange(graph, figma.currentPageId) : null
  const guard = createDesignGuard(graph, {
    content: tool.content,
    args,
    mode: options.designMemory ?? 'warn'
  })
  let result: unknown
  try {
    result = await editDocument(graph, () => tool.execute(figma, args))
  } catch (error) {
    recorder?.finish()
    throw error
  }
  const change = recorder?.finish()
  const refusal = change ? guard.verifyChange(change) : null
  if (change && refusal instanceof DesignMemoryRefusalError) {
    applyDocumentChange(graph, change, 'before')
    return refusal.toResult()
  }
  return guard.annotate(result)
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
    // A person runs these commands, so the design memory only warns.
    return {
      result: await rpc('tool', { ...target, name, args, designMemory: 'warn' }),
      graph: null
    }
  }
  const tool = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  const headless = await openHeadlessFigma(requireFile(file), targetArgs)
  return { result: await runHeadlessTool(headless, tool, args), graph: headless.graph }
}

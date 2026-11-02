import { FigmaAPI } from '@open-pencil/core/figma-api'
import { headlessHTMLStyler } from '@open-pencil/core/io/formats/html/import'
import {
  createCanvasKitRasterCodec,
  headlessRenderNodes,
  initCanvasKit
} from '@open-pencil/core/io/formats/raster'
import { ALL_TOOLS, registerHTMLToolHost, type ToolDef } from '@open-pencil/core/tools'
import type { SceneGraph } from '@open-pencil/scene-graph'

import { isAppMode, requireFile, rpc } from '#cli/app/client'
import { appTargetRPCArgs, type AppTargetCLIArgs } from '#cli/app/target'
import {
  editDocument,
  loadDocument,
  measureDocumentText,
  populateWholeDocument
} from '#cli/headless'

/** A Figma API over a headless document, with CanvasKit raster export and pixel decoding. */
export async function createHeadlessFigma(graph: SceneGraph): Promise<FigmaAPI> {
  const figma = new FigmaAPI(graph)
  figma.exportImage = (nodeIds, options) =>
    headlessRenderNodes(graph, options.pageId ?? figma.currentPageId, nodeIds, options)
  figma.rasterCodec = createCanvasKitRasterCodec(await initCanvasKit())
  // Node reads Tailwind's stylesheets from the installed package, so export needs no loader.
  registerHTMLToolHost(graph, { style: headlessHTMLStyler })
  return figma
}

/** A document file loaded for headless tool calls, with the Figma API the tools run on. */
export interface HeadlessToolDocument {
  graph: SceneGraph
  figma: FigmaAPI
}

/** Loads `file` with every page populated and its text measured, ready for tool calls. */
export async function loadHeadlessToolDocument(file: string): Promise<HeadlessToolDocument> {
  const graph = await loadDocument(file)
  populateWholeDocument(graph)
  await measureDocumentText(graph)
  return { graph, figma: await createHeadlessFigma(graph) }
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
 * Run a Core tool against the running app, or headlessly against a document file.
 * Headless runs return the loaded graph so mutating commands can write it back.
 */
export async function runToolData(
  file: string | undefined,
  name: string,
  args: Record<string, unknown>,
  targetArgs?: AppTargetCLIArgs
): Promise<{ result: unknown; graph: SceneGraph | null }> {
  if (isAppMode(file)) {
    const target = targetArgs ? appTargetRPCArgs(targetArgs) : {}
    return { result: await rpc('tool', { ...target, name, args }), graph: null }
  }
  const tool = ALL_TOOLS.find((candidate) => candidate.name === name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  const headless = await loadHeadlessToolDocument(requireFile(file))
  return { result: await runHeadlessTool(headless, tool, args), graph: headless.graph }
}

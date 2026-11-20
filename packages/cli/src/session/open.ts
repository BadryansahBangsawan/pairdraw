import { basename, resolve } from 'node:path'

import { flushPendingLayout } from '@pairdraw/core/figma-api'
import type { ToolDef } from '@pairdraw/core/tools'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { rpc } from '#cli/app/client'
import { appPageTargetRPCArgs, type PageCLIArgs } from '#cli/app/target'
import { writeDocumentFile } from '#cli/headless'
import { appPreview, PREVIEW_TOOL, previewArgs, previewImage } from '#cli/session/preview'
import { findCLITool } from '#cli/session/tools'
import {
  loadHeadlessToolDocument,
  runHeadlessTool,
  type HeadlessToolDocument
} from '#cli/tool-data'

/**
 * A document that stays open across tool calls: a file loaded headlessly once, or the document
 * the running app has open.
 */
export interface ToolSession {
  /** The file name, or `app` when the session drives the running app. */
  readonly label: string
  /** The headless document, or `null` when the running app holds it. */
  readonly graph: SceneGraph | null
  call(def: ToolDef, args: Record<string, unknown>): Promise<unknown>
  /** A PNG of the current page as it is now. */
  preview(scale: number): Promise<Uint8Array>
  /**
   * Saves the document as `.fig`. A headless session needs a path; the app saves to the
   * document's own file unless one is given.
   */
  save(path?: string): Promise<void>
}

/** A PNG of the page current in `headless.figma`, with pending layout applied first. */
export async function headlessPreview(
  headless: HeadlessToolDocument,
  scale: number
): Promise<Uint8Array> {
  // Edits nothing has read yet are laid out first, as saving lays them out.
  flushPendingLayout(headless.graph)
  const exportImage = findCLITool(PREVIEW_TOOL)
  return previewImage(await runHeadlessTool(headless, exportImage, previewArgs(scale)))
}

/**
 * Keeps `file` loaded and runs each call on the same Figma API, as `tool call` and the `diff`
 * commands run one.
 */
export async function openHeadlessSession(
  file: string,
  pageArgs: PageCLIArgs = {}
): Promise<ToolSession> {
  const headless = await loadHeadlessToolDocument(file, pageArgs)
  const { graph } = headless
  return {
    label: basename(file),
    graph,
    call: (def, args) => runHeadlessTool(headless, def, args),
    preview: (scale) => headlessPreview(headless, scale),
    async save(path) {
      if (!path) throw new Error('A headless document needs a path to save to')
      flushPendingLayout(graph)
      await writeDocumentFile(graph, path)
    }
  }
}

/** Sends each call to the document the running app has open, or the one `target` names. */
async function openAppSession(target: PageCLIArgs = {}): Promise<ToolSession> {
  const targetArgs = await appPageTargetRPCArgs(target)
  return {
    label: 'app',
    graph: null,
    call: (def, args) => rpc('tool', { ...targetArgs, name: def.name, args }),
    preview: (scale) => appPreview(targetArgs, scale),
    async save(path) {
      // The app resolves paths against its own working directory, so send an absolute one.
      await rpc('save_file', { ...targetArgs, ...(path ? { path: resolve(path) } : {}) })
    }
  }
}

/** A headless session for `file`, or an app session when no file is given. */
export function openToolSession(
  file: string | undefined,
  target: PageCLIArgs = {}
): Promise<ToolSession> {
  return file ? openHeadlessSession(file, target) : openAppSession(target)
}

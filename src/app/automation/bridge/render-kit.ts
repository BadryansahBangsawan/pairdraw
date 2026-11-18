import type { CanvasKit } from 'canvaskit-wasm'

import { getCanvasKit } from '@pairdraw/core/canvaskit'

import type { EditorStore } from '@/app/editor/active-store'

/**
 * The CanvasKit an offscreen export draws with. A document in a background tab has no canvas of
 * its own; the app's own CanvasKit build renders it, and the Figma API built for the command
 * decodes what it exports.
 */
let renderKit: CanvasKit | null = null

/** The loaded CanvasKit, for a caller that needs it without awaiting, or null before one loads. */
export function automationRenderKit(): CanvasKit | null {
  return renderKit
}

/**
 * Readies a document to render before a command runs. A document on screen draws with its own
 * canvas; one that is not loads the app's CanvasKit, which the export renderer then shares.
 */
export async function prepareAutomationRendering(store: EditorStore): Promise<void> {
  if (store.renderer) return
  renderKit ??= await getCanvasKit()
}

import type { Editor } from '@pairdraw/core'
import { isSVGMarkup } from '@pairdraw/core/io/formats/svg'
import { detectMermaidDiagram } from '@pairdraw/mermaid'
import type { Vector } from '@pairdraw/scene-graph/primitives'
import { filesMessages } from '@pairdraw/vue/i18n'

import { toast } from '@/app/shell/ui'

import { isLayerClipboardHTML } from '../html'
import { matchingClipboardSnapshot } from '../memory'
import { chooseClipboardImport } from './import-prompt'
import { pasteWebClipboardHTML } from './web'

/**
 * Paste the clipboard's design. Layers copied from another open document that use its
 * variables or styles first ask whether to import them; cancelling pastes nothing.
 */
export async function pasteClipboardHTML(
  editor: Editor,
  html: string,
  cursorPos?: Vector,
  options: Parameters<Editor['pasteFromHTML']>[2] = {}
): Promise<void> {
  const snapshot = matchingClipboardSnapshot(html)
  if (!snapshot) {
    // HTML without layers is web content: a capture, or a page's own clipboard fragment.
    if (!isLayerClipboardHTML(html) && (await pasteWebClipboardHTML(editor, html, cursorPos))) {
      return
    }
    await editor.pasteFromHTML(html, cursorPos, options)
    return
  }
  // Copy properties marks a snapshot Paste skips, so it never asks about one.
  const dependencies = snapshot.properties
    ? undefined
    : await chooseClipboardImport(editor.graph, snapshot)
  if (dependencies === null) return
  await editor.pasteSnapshot(snapshot, cursorPos, { ...options, dependencies })
}

/** Where a paste without a copied position goes: the cursor, else the middle of the canvas. */
export function pastePoint(editor: Editor, cursorPos?: Vector): Vector {
  if (cursorPos) return cursorPos
  const middle = editor.viewportCanvasCenter()
  const { panX, panY, zoom } = editor.state
  return { x: (middle.x - panX) / zoom, y: (middle.y - panY) / zoom }
}

/** Paste SVG markup, such as Figma's Copy as SVG, as layers; false when the text is not SVG. */
async function pasteSVGText(editor: Editor, text: string, cursorPos?: Vector): Promise<boolean> {
  if (!isSVGMarkup(text)) return false
  const { x, y } = pastePoint(editor, cursorPos)
  return editor.pasteSVG(text, x, y)
}

/** Whether pasted text becomes layers of its own, as SVG markup and Mermaid diagrams do. */
export function isLayerText(text: string): boolean {
  return isSVGMarkup(text) || detectMermaidDiagram(text) !== null
}

/**
 * Paste a Mermaid flowchart as FigJam layers laid out around the point; false when the text is
 * not one. A flowchart Mermaid cannot read reports why, its first line being Mermaid's summary.
 */
async function pasteMermaidText(
  editor: Editor,
  text: string,
  cursorPos?: Vector
): Promise<boolean> {
  if (!detectMermaidDiagram(text)) return false
  const { x, y } = pastePoint(editor, cursorPos)
  try {
    return await editor.pasteMermaid(text, x, y)
  } catch (error) {
    const reason = error instanceof Error ? (error.message.split('\n')[0] ?? '') : ''
    toast.error(filesMessages.get().mermaidPasteFailed({ error: reason }))
    return true
  }
}

/** Paste text that becomes layers of its own; false for any other text. */
export async function pasteLayerText(
  editor: Editor,
  text: string,
  cursorPos?: Vector
): Promise<boolean> {
  return (
    (await pasteSVGText(editor, text, cursorPos)) ||
    (await pasteMermaidText(editor, text, cursorPos))
  )
}

/**
 * Paste copied text: markup that draws layers of its own, or any other text as a text layer
 * holding it, as Figma does; false when the text is blank.
 */
export async function pasteClipboardText(
  editor: Editor,
  text: string,
  cursorPos?: Vector
): Promise<boolean> {
  if (await pasteLayerText(editor, text, cursorPos)) return true
  return editor.pastePlainText(text, cursorPos?.x, cursorPos?.y)
}

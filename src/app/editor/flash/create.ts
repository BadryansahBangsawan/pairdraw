import type { Editor } from '@pairdraw/core'

export function createFlashActions(editor: Editor) {
  let flashRafId = 0

  function pumpFlashes() {
    if (!editor.renderer?.hasActiveFlashes) {
      flashRafId = 0
      return
    }
    // The canvas draws a frame only when asked, so each flash frame asks for a repaint.
    editor.requestRepaint()
    flashRafId = requestAnimationFrame(pumpFlashes)
  }

  function flashNodes(nodeIds: string[]) {
    const renderer = editor.renderer
    if (!renderer) return
    for (const id of nodeIds) renderer.flashNode(id)
    if (!flashRafId) pumpFlashes()
  }

  function aiMarkActive(nodeIds: string[]) {
    if (!editor.renderer) return
    editor.renderer.aiMarkActive(nodeIds)
    if (!flashRafId) pumpFlashes()
  }

  function aiMarkDone(nodeIds: string[]) {
    if (!editor.renderer) return
    editor.renderer.aiMarkDone(nodeIds)
    if (!flashRafId) pumpFlashes()
  }

  function aiFlashDone(nodeIds: string[]) {
    if (!editor.renderer) return
    editor.renderer.aiFlashDone(nodeIds)
    if (!flashRafId) pumpFlashes()
  }

  function aiClearAll() {
    editor.renderer?.aiClearAll()
  }

  return {
    flashNodes,
    aiMarkActive,
    aiMarkDone,
    aiFlashDone,
    aiClearAll
  }
}

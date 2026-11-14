import { useEventListener } from '@vueuse/core'
import { computed, onScopeDispose, shallowRef, type Ref } from 'vue'

import { resolveEditorProfile, type Editor, type HyperlinkHit } from '@pairdraw/core'

export interface CanvasLinkOptions {
  /** Whether this canvas takes the pointer, such as the active pane of a split view. */
  isEnabled?: () => boolean
}

/**
 * Follows links on text from the canvas: ⌘-click or Ctrl-click a linked word while designing,
 * or click it in a preview, and the editor follows the link (`Editor.followHyperlink`), which
 * hands web and mail addresses to the front end through `hyperlink:open`. Text being edited
 * keeps its clicks for the caret.
 *
 * Listeners run in the capture phase so a followed link never starts a selection, marquee, or
 * deep selection. The pointer turns into a hand over a link that a click would follow.
 */
export function useCanvasLinks(
  canvasRef: Ref<HTMLCanvasElement | null>,
  editor: Editor,
  options: CanvasLinkOptions = {}
) {
  const hovered = shallowRef<HyperlinkHit | null>(null)
  let lastPointer: { clientX: number; clientY: number } | null = null

  const enabled = () => options.isEnabled?.() ?? true

  /** Whether a click with these modifiers follows a link rather than selecting. */
  function follows(modified: boolean): boolean {
    if (resolveEditorProfile(editor.state).pointer === 'pan') {
      return editor.state.activeTool !== 'HAND'
    }
    return modified && editor.state.activeTool === 'SELECT'
  }

  function linkAt(pointer: { clientX: number; clientY: number }): HyperlinkHit | null {
    const canvas = canvasRef.value
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const { x, y } = editor.screenToCanvas(pointer.clientX - rect.left, pointer.clientY - rect.top)
    const hit = editor.hyperlinkAtPoint(x, y)
    return hit && hit.nodeId !== editor.state.editingTextId ? hit : null
  }

  function refresh(modified: boolean, buttons = 0) {
    hovered.value =
      lastPointer && buttons === 0 && enabled() && follows(modified) ? linkAt(lastPointer) : null
  }

  function onMouseMove(event: MouseEvent) {
    lastPointer = { clientX: event.clientX, clientY: event.clientY }
    refresh(event.metaKey || event.ctrlKey, event.buttons)
  }

  function onMouseDown(event: MouseEvent) {
    if (event.button !== 0 || !enabled() || !follows(event.metaKey || event.ctrlKey)) return
    const hit = linkAt(event)
    if (!hit) return
    event.preventDefault()
    event.stopImmediatePropagation()
    void editor.followHyperlink(hit.span.link)
  }

  function onModifier(event: KeyboardEvent) {
    if (!event.code.startsWith('Meta') && !event.code.startsWith('Control')) return
    refresh(event.metaKey || event.ctrlKey)
  }

  useEventListener(canvasRef, 'mousemove', onMouseMove, { capture: true })
  useEventListener(canvasRef, 'mousedown', onMouseDown, { capture: true })
  useEventListener(canvasRef, 'mouseleave', () => {
    lastPointer = null
    hovered.value = null
  })
  useEventListener(window, ['keydown', 'keyup'], onModifier)
  useEventListener(window, 'blur', () => (hovered.value = null))
  const stopViewport = editor.onEditorEvent('viewport:changed', () => (hovered.value = null))
  onScopeDispose(stopViewport)

  return {
    /** The link under the pointer that a click would follow. */
    hovered,
    cursor: computed(() => (hovered.value ? 'pointer' : null))
  }
}

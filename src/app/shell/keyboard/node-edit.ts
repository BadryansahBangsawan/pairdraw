import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

import { resolveEditorProfile } from '@open-pencil/core'

import type { EditorStore } from '@/app/editor/active-store'
import type { VectorEditState } from '@/app/editor/vector/types'
import { isButtonActivation, isEditing } from '@/app/shell/keyboard/focus'
import { shortcutCode } from '@/app/shell/keyboard/layout'
import { nudgeDistance } from '@/app/shell/keyboard/nudging'

const ARROW_DIRECTIONS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
}

const OVERLAY_SELECTOR = '[data-picker-content], [role="dialog"], [role="listbox"], [role="menu"]'
const OPEN_LAYER_SELECTOR = '[data-dismissable-layer]:not([data-state="closed"])'

/** What the keys read and run: the edit state and the path actions of the editor store. */
type NodeEditKeyStore = Pick<
  EditorStore,
  'nodeEditSetCutTool' | 'nodeEditJoinEndpoints' | 'nodeEditNudgeSelected'
> & {
  state: VectorEditState & { numberFieldFocused?: boolean }
}

/** A key meant for a field, a button, or an open menu, popover, or dialog rather than the path. */
function isForOtherControl(event: KeyboardEvent, inputFocused: boolean) {
  return (
    inputFocused ||
    isButtonActivation(event) ||
    isEditing(event) ||
    document.querySelector(OPEN_LAYER_SELECTOR) !== null ||
    event
      .composedPath()
      .some((target) => target instanceof Element && target.matches(OVERLAY_SELECTOR))
  )
}

/** Whether the canvas has the keys, rather than a panel's tabs, tree, slider, or toggle group. */
function isCanvasFocus(event: KeyboardEvent) {
  return event.target === document.body || event.target instanceof HTMLCanvasElement
}

/**
 * Runs a key on the path being edited, as Figma's vector edit mode does, and says whether it did:
 * X picks up or puts down the cut tool, Escape puts it down, ⌘/Ctrl+J joins the two selected end
 * points, and the arrow keys move the selected points by the nudge distances in Settings → Editor
 * rather than moving the layer. A tool key puts the cut tool down and goes on to pick its tool.
 * Only ⌘/Ctrl+J runs while another control has focus (`onCanvas` false), so a focused panel
 * widget keeps its own arrow keys.
 */
export function runNodeEditKey(
  store: NodeEditKeyStore,
  event: KeyboardEvent,
  onCanvas = true
): boolean {
  const es = store.state.nodeEditState
  if (!es || store.state.editingTextId || store.state.numberFieldFocused) return false
  const code = shortcutCode(event)
  const mod = event.metaKey || event.ctrlKey

  // The chat column's ⌘J is Figma's join while a path is being edited.
  if (mod && !event.altKey && !event.shiftKey && code === 'KeyJ') {
    store.nodeEditJoinEndpoints()
    return true
  }
  if (mod || event.altKey || !onCanvas) return false

  const direction = ARROW_DIRECTIONS[event.code]
  if (direction) {
    const step = nudgeDistance(event.shiftKey)
    // A held key's repeats join its first press, so one undo takes back the whole move.
    store.nodeEditNudgeSelected(direction[0] * step, direction[1] * step, !event.repeat)
    return true
  }
  if (event.shiftKey) return false

  if (code === 'KeyX') {
    store.nodeEditSetCutTool(!es.cutTool)
    return true
  }
  if (es.cutTool && event.code === 'Escape') {
    store.nodeEditSetCutTool(false)
    return true
  }
  if (es.cutTool && resolveEditorProfile(store.state).toolKeys[code]) {
    store.nodeEditSetCutTool(false)
  }
  return false
}

/**
 * Binds the keys of {@link runNodeEditKey}. It must be bound before the editor's shortcuts, which
 * also listen while capturing, so a key it runs reaches neither them nor the layer nudge.
 */
export function bindNodeEditKeys(store: EditorStore, inputFocused: Readonly<Ref<boolean>>) {
  useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
      if (!store.state.nodeEditState || isForOtherControl(event, inputFocused.value)) return
      if (!runNodeEditKey(store, event, isCanvasFocus(event))) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true }
  )
}

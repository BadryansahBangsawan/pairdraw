import { useEventListener } from '@vueuse/core'
import type { ComputedRef } from 'vue'

import type { Tool } from '@open-pencil/core'

import type { EditorStore } from '@/app/editor/active-store'

import { isEditing } from './focus'
import { shortcutCode } from './layout'

/** How long Z is held before its release goes back to the tool before it, as Figma's does. */
export const ZOOM_TOOL_HOLD_MS = 250

/** The tool to go back to when Z is released, or null while Z picks the zoom tool for good. */
export function toolAfterZoomKey(
  toolBefore: Tool | null,
  activeTool: Tool,
  heldMs: number,
  zoomed: boolean
): Tool | null {
  if (toolBefore === null || toolBefore === 'ZOOM' || activeTool !== 'ZOOM') return null
  return zoomed || heldMs >= ZOOM_TOOL_HOLD_MS ? toolBefore : null
}

/** What the Z spring needs of the editor: the tool, the view, and setting the tool. */
export interface ZoomKeyStore {
  state: { activeTool: Tool; panX: number; panY: number; zoom: number }
  setTool: (tool: Tool) => void
}

/**
 * The spring-loaded Z: `press` and `release` follow the key, `pointerDown` and `pointerUp` the
 * mouse button. Releasing Z while the button is down waits for the button, so a zoom drag the
 * button finishes after Z comes up still zooms before the tool before comes back.
 */
export function createZoomKeySpring(
  store: ZoomKeyStore,
  now: () => number = () => performance.now()
) {
  let toolBefore: Tool | null = null
  let pressedAt = 0
  /** The view when Z went down; a different one at the release means Z was used to zoom. */
  let viewAtPress = ''
  /** Whether the canvas was pressed while Z was held, which also means Z was used to zoom. */
  let pressedWhileHeld = false
  let buttonDown = false
  /** The tool to go back to once the button comes up. */
  let pending: Tool | null = null

  const viewKey = () => `${store.state.panX},${store.state.panY},${store.state.zoom}`

  function restore(tool: Tool) {
    if (store.state.activeTool === 'ZOOM') store.setTool(tool)
  }

  function press() {
    pending = null
    toolBefore = store.state.activeTool
    pressedAt = now()
    viewAtPress = viewKey()
    pressedWhileHeld = buttonDown
  }

  function release() {
    if (toolBefore === null) return
    const tool = toolAfterZoomKey(
      toolBefore,
      store.state.activeTool,
      now() - pressedAt,
      pressedWhileHeld || viewKey() !== viewAtPress
    )
    toolBefore = null
    if (!tool) return
    if (buttonDown) pending = tool
    else restore(tool)
  }

  function pointerDown() {
    buttonDown = true
    if (toolBefore !== null) pressedWhileHeld = true
  }

  function pointerUp() {
    buttonDown = false
    const tool = pending
    pending = null
    if (tool) restore(tool)
  }

  /** The window lost focus: the key and the button are both up. */
  function reset() {
    release()
    pointerUp()
  }

  return { press, release, pointerDown, pointerUp, reset }
}

/**
 * Makes Z spring-loaded, as in Figma, matched as the shortcut is, by the letter the layout types:
 * the key's own shortcut picks the zoom tool, and releasing Z after holding it, or after zooming
 * with it held, goes back to the tool before. A quick tap keeps the zoom tool. Bound before the
 * shortcut handler, so it sees the tool Z replaces; the button's release is heard after the
 * canvas's, so a zoom drag lands first.
 */
export function bindZoomToolKey(inputFocused: ComputedRef<boolean>, store: EditorStore) {
  const spring = createZoomKeySpring(store)

  useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
      if (shortcutCode(event) !== 'KeyZ' || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      if (isEditing(event) || inputFocused.value || store.state.editingTextId) return
      spring.press()
    },
    { capture: true }
  )
  useEventListener(window, 'keyup', (event: KeyboardEvent) => {
    if (shortcutCode(event) === 'KeyZ') spring.release()
  })
  useEventListener(
    window,
    'pointerdown',
    (event: PointerEvent) => {
      if (event.button === 0) spring.pointerDown()
    },
    { capture: true }
  )
  useEventListener(window, ['pointerup', 'pointercancel'], (event: PointerEvent) => {
    if (event.button === 0 || event.type === 'pointercancel') spring.pointerUp()
  })
  useEventListener(window, 'blur', () => spring.reset())
}

import { useEventListener } from '@vueuse/core'

import { resolveEditorProfile, type EditorProfileInputs, type EditorState } from '@pairdraw/core'

import type { EditorStore } from '@/app/editor/active-store'
import { appPreferences, type NudgePreferences } from '@/app/settings/preferences/store'
import { isEditing } from '@/app/shell/keyboard/focus'
import { nudgeBlocked } from '@/app/shell/keyboard/overlays'
import { isReservedModShortcut } from '@/app/shell/keyboard/reserved'

const NUDGE_DELTAS: Partial<Record<string, [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0]
}

/**
 * How far one arrow key press moves the selection: the small nudge, or the large one with Shift,
 * as Settings → Editor sets them (1 and 10 by default, as in Figma).
 */
export function nudgeDistance(
  large: boolean,
  nudge: NudgePreferences = appPreferences.value.editing.nudge
): number {
  return large ? nudge.large : nudge.small
}

/** What decides whether an arrow key nudges: the canvas's view and what is selected or typed in. */
type NudgeState = EditorProfileInputs & Pick<EditorState, 'selectedIds' | 'editingTextId'>

/**
 * How far an arrow key press moves the selection, or null when it moves nothing: with no
 * selection, while text is typed, with a modifier other than Shift, or in a view that runs only
 * its own keys, such as a preview or Shader Mode.
 */
export function nudgeForKey(
  state: NudgeState,
  e: Pick<KeyboardEvent, 'code' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>,
  nudge?: NudgePreferences
): [number, number] | null {
  if (state.editingTextId || e.metaKey || e.ctrlKey || e.altKey) return null
  if (resolveEditorProfile(state).shortcuts === 'view') return null
  const delta = NUDGE_DELTAS[e.code]
  if (!delta || state.selectedIds.size === 0) return null
  const step = nudgeDistance(e.shiftKey, nudge)
  return [delta[0] * step, delta[1] * step]
}

export function bindNudgeKeys(store: EditorStore) {
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (isEditing(e) || store.state.editingTextId) return
    if (isReservedModShortcut(e)) e.preventDefault()

    const nudge = nudgeForKey(store.state, e)
    if (!nudge) return
    if (nudgeBlocked(e)) return
    store.nudgeSelected(nudge[0], nudge[1])
    e.preventDefault()
  })
}

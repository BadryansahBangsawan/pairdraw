import { useEventListener } from '@vueuse/core'

import type { EditorStore } from '@/app/editor/active-store'
import { appPreferences, type NudgePreferences } from '@/app/settings/preferences/store'
import { isEditing } from '@/app/shell/keyboard/focus'
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

export function bindNudgeKeys(store: EditorStore) {
  useEventListener(window, 'keydown', (e: KeyboardEvent) => {
    if (isEditing(e) || store.state.editingTextId) return
    if (isReservedModShortcut(e)) e.preventDefault()
    if (e.metaKey || e.ctrlKey || e.altKey) return

    const delta = NUDGE_DELTAS[e.code]
    if (!delta || store.state.selectedIds.size === 0) return

    const step = nudgeDistance(e.shiftKey)
    store.nudgeSelected(delta[0] * step, delta[1] * step)
    e.preventDefault()
  })
}

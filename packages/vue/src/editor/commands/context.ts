import type { ComputedRef } from 'vue'

import type { Editor } from '@pairdraw/core'

import type { useSelectionCapabilities } from '#vue/editor/selection-capabilities/use'
import type { useSelectionState } from '#vue/editor/selection-state/use'

type CommandMessagesStore = { value: Record<string, string> }
type SelectionState = ReturnType<typeof useSelectionState>
type SelectionCapabilities = ReturnType<typeof useSelectionCapabilities>

export type EditorCommandMapOptions = {
  editor: Editor
  selection: SelectionState
  capabilities: SelectionCapabilities
  messages: CommandMessagesStore
  otherPages: ComputedRef<Array<{ id: string }>>
  moveSelectionToPage: (pageId: string) => void
  getOpacityTarget: () => { value: number; coalesceKey?: string }
}

import { isEqual } from 'es-toolkit'
import { computed } from 'vue'

import {
  agentNotesFromDraft,
  readAgentNotes,
  withAgentNotes,
  type AgentNotes,
  type AgentNotesDraft
} from '@pairdraw/scene-graph/agent-notes'
import { useSceneComputed } from '@pairdraw/vue/internal/scene-computed'

import { sendPromptToDocument } from '@/app/ai/chat/pending-prompt'
import { referenceLink } from '@/app/ai/chat/references/link'
import { useEditorStore, type EditorStore } from '@/app/editor/active-store'

const UNDO_LABEL = 'Edit notes for AI'

/**
 * Writes `draft` as the layer's notes in one undo step; blank notes remove them. Nothing is
 * recorded when the notes stay the same, so leaving a field unchanged adds no undo step.
 */
export function saveAgentNotes(store: EditorStore, nodeId: string, draft: AgentNotesDraft | null) {
  const node = store.graph.getNode(nodeId)
  if (!node || node.type === 'CANVAS') return
  const next = draft ? agentNotesFromDraft(draft) : null
  if (isEqual(next, readAgentNotes(node))) return
  store.updateNodeWithUndo(nodeId, { pluginData: withAgentNotes(node, next) }, UNDO_LABEL)
}

/**
 * Sends a layer's prompt to the document's chat, naming the layer so the agent knows what it is
 * about and the chat shows its preview, and shows the chat.
 */
export function runAgentPrompt(store: EditorStore, nodeId: string, prompt: string): boolean {
  const node = store.graph.getNode(nodeId)
  const text = prompt.trim()
  if (!node || !text) return false
  const layer = referenceLink({ kind: 'node', id: node.id, label: node.name })
  sendPromptToDocument(store, `${layer} ${text}`)
  return true
}

/** The selected layer's notes for agents, and the actions the Design panel's section offers. */
export function useSelectedAgentNotes() {
  const store = useEditorStore()
  const node = useSceneComputed(() => {
    if (store.state.selectedIds.size !== 1) return null
    const [id] = store.state.selectedIds
    const selected = id ? store.graph.getNode(id) : undefined
    return selected && selected.type !== 'CANVAS' ? selected : null
  })
  const notes = useSceneComputed<AgentNotes | null>(() =>
    node.value ? readAgentNotes(node.value) : null
  )
  const nodeId = computed(() => node.value?.id ?? null)

  /** Replaces one note of `nodeId`, the layer the field was edited for, keeping the other. */
  function save(id: string, field: keyof AgentNotesDraft, value: string) {
    const current = store.graph.getNode(id)
    const stored = current ? readAgentNotes(current) : null
    saveAgentNotes(store, id, { ...stored, [field]: value })
  }

  return {
    nodeId,
    notes,
    save,
    remove: (id: string) => saveAgentNotes(store, id, null),
    run: (id: string, prompt: string) => runAgentPrompt(store, id, prompt)
  }
}

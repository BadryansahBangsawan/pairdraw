import { shallowRef } from 'vue'

import {
  clipboardImportHasDependencies,
  planClipboardImport,
  type ClipboardImportChoice,
  type ClipboardImportPlan,
  type ClipboardSnapshot
} from '@open-pencil/core'
import type { SceneGraph } from '@open-pencil/scene-graph'

/** The question the paste import dialog shows, or null while nothing is asked. */
export const clipboardImportPrompt = shallowRef<{ id: number; plan: ClipboardImportPlan } | null>(
  null
)

let answerPending: ((choice: ClipboardImportChoice | null) => void) | null = null
let nextId = 0

/** Answers the question the dialog shows; null cancels the paste. */
export function answerClipboardImport(choice: ClipboardImportChoice | null): void {
  const answer = answerPending
  answerPending = null
  clipboardImportPrompt.value = null
  answer?.(choice)
}

/**
 * Asks how to paste layers that use another document's variables or styles: import them, or
 * paste the layers as they look. A paste started while one is asked cancels the earlier one,
 * as the clipboard can hold only the latest copy.
 */
export function requestClipboardImport(
  plan: ClipboardImportPlan
): Promise<ClipboardImportChoice | null> {
  answerClipboardImport(null)
  return new Promise((answer) => {
    answerPending = answer
    clipboardImportPrompt.value = { id: ++nextId, plan }
  })
}

/**
 * How a snapshot pastes into this document: undefined when there is nothing to ask, as for a
 * copy from the same document, the person's choice otherwise, or null when they cancel.
 */
export async function chooseClipboardImport(
  graph: SceneGraph,
  snapshot: ClipboardSnapshot
): Promise<ClipboardImportChoice | null | undefined> {
  const plan = planClipboardImport(graph, snapshot)
  if (!clipboardImportHasDependencies(plan)) return undefined
  return requestClipboardImport(plan)
}

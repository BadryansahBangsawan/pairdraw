import type { FigmaAPI } from '@pairdraw/core/figma-api'

import { createMutex } from '@/app/ai/tools/mutex'
import { noOutsideWritesSince } from '@/app/document/io/outside-writes'
import type { EditorStore } from '@/app/editor/active-store'
import { ensureGraphFonts } from '@/app/editor/fonts'

/** Undo steps made through the automation bridge (MCP, CLI) start with this label. */
export const AUTOMATION_UNDO_LABEL = 'Agent'

export function automationUndoLabel(operation: string): string {
  return `${AUTOMATION_UNDO_LABEL}: ${operation}`
}

export function isAutomationUndoLabel(label: string | null): boolean {
  return label?.startsWith(`${AUTOMATION_UNDO_LABEL}: `) === true
}

/** Each document's agent edits, from any client, run one at a time. */
const editLocks = new WeakMap<EditorStore, () => Promise<() => void>>()

/**
 * Waits for a document's turn to edit and resolves with the release. Agent edits that await take
 * it, so none records or rolls back another's writes as its own.
 */
export function acquireDocumentEdit(store: EditorStore): Promise<() => void> {
  let lock = editLocks.get(store)
  if (!lock) {
    lock = createMutex()
    editLocks.set(store, lock)
  }
  return lock()
}

/**
 * Loads the fonts a committed atomic edit drew its text in. This is presentation work after the
 * edit's step, not part of it, so it runs outside the edit.
 */
export async function loadAtomicToolFonts(
  store: EditorStore,
  figma: FigmaAPI,
  args: Record<string, unknown>,
  options: { isLive?: () => boolean } = {}
): Promise<void> {
  const targetId = typeof args.id === 'string' ? args.id : figma.currentPageId
  if (figma.graph.getNode(targetId)?.type === 'TEXT') {
    try {
      await ensureGraphFonts(figma.graph, [targetId], store.renderer)
      if (store.graph === figma.graph && options.isLive?.() !== false) {
        store.runLayoutForNode(targetId)
        store.requestRender()
      }
    } catch (error) {
      // The edit is already committed and undoable. Font failure must not report it as failed.
      console.warn('[Agent fonts]', error)
    }
  }
}

/**
 * Run a structural edit as one undo step by recording what it changes in the document, as the
 * AI chat does, so `undo` reverts what an automation client created, moved, or deleted on any
 * page, and the variables it changed. It waits for the document's other agent edits. An edit that
 * throws part way, such as a failing script, is put back whole and leaves no step, unless
 * something else wrote to the document meanwhile.
 */
export async function executeWithDocumentUndo<T>(
  store: EditorStore,
  pageId: string,
  label: string,
  run: () => Promise<T>
): Promise<T> {
  const release = await acquireDocumentEdit(store)
  try {
    return await store.recordEditAsync(
      { label, pageId, rollbackOnThrow: true, canRollBack: noOutsideWritesSince(store) },
      run
    )
  } finally {
    release()
  }
}

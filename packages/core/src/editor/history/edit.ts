import type { SceneGraph } from '@open-pencil/scene-graph'
import type { UndoManager } from '@open-pencil/scene-graph/undo'

import {
  applyDocumentChange,
  captureDocumentChange,
  isEmptyDocumentChange,
  restoreDocumentChange,
  type DocumentChange
} from '#core/editor/history/document-change'
import type { EditorContext } from '#core/editor/types'

export interface RecordEditOptions {
  /** The undo step's label. */
  label: string
  /** The page the edit is made from; it is recorded wherever in the document it lands. */
  pageId?: string
  /** False for an edit that records its own steps, such as an atomic tool's. */
  push?: boolean
  /**
   * Records the step on its own, settling any batch first, rather than as part of an open batch.
   * An edit that finishes after an await needs this: a batch open by then belongs to another
   * edit, such as a picker drag. `recordEditAsync` always does.
   */
  ownStep?: boolean
  /**
   * Puts back everything the edit changed when it throws, so a failed agent call or script leaves
   * the document as it found it and records no step. Undoing it costs what the edit touched, not
   * a copy of the document. Without it, or when something else wrote to the document while the
   * edit ran, what the edit did before it threw stays as one step.
   */
  rollbackOnThrow?: boolean
  /**
   * Whether nothing outside the editor's history wrote to the document since the edit began, such
   * as a collaborator. Asked once the edit has thrown; false records the edit's step instead of a
   * rollback that would revert those writes too. Writes the history sees are checked anyway.
   */
  canRollBack?: () => boolean
  /**
   * Receives what the edit changed, also when it fails, before its step closes. An edit rolled
   * back after it threw changed nothing.
   */
  onRecorded?: (change: DocumentChange) => void
}

function unchanged(pageId: string): DocumentChange {
  return {
    pageId,
    pageIds: [],
    created: [],
    deleted: [],
    updated: [],
    children: { before: [], after: [] },
    variables: [],
    collections: []
  }
}

/** How many edits that await are running in each history. */
const runningEdits = new WeakMap<UndoManager, number>()

/**
 * Watches, while an edit awaits, for writes it does not own: a step recorded, undone, or redone,
 * another edit or a batch open, or text being edited. They land in the edit's change, so rolling
 * it back would revert them too. Returns the function that stops watching and tells.
 */
function watchOtherWrites(ctx: EditorContext): () => boolean {
  const { undo } = ctx
  const running = runningEdits.get(undo) ?? 0
  let others = running > 0 || undo.isRecording || ctx.state.editingTextId !== null
  runningEdits.set(undo, running + 1)
  const stop = ctx.onEditorEvent('history:changed', () => {
    others = true
  })
  return () => {
    stop()
    const left = (runningEdits.get(undo) ?? 1) - 1
    runningEdits.set(undo, left)
    return others || left > 0 || undo.isBatching || ctx.state.editingTextId !== null
  }
}

/**
 * Puts the document back as it was before a failed edit, keeping the selection the edit left
 * alone; false when that failed too, and the edit's step is then recorded instead, so what it did
 * stays undoable.
 */
function rollBack(ctx: EditorContext, graph: SceneGraph, change: DocumentChange): boolean {
  try {
    if (ctx.graph !== graph) {
      // The document the edit ran in is no longer shown, so only its graph goes back.
      applyDocumentChange(graph, change, 'before')
      return true
    }
    restoreDocumentChange(ctx, change, 'before', { keepSelection: true })
  } catch {
    return false
  }
  // The document is back where its history left it, so what follows the history, such as its
  // unsaved state, settles as after an undo.
  ctx.emitEditorEvent('history:changed')
  return true
}

function begin(ctx: EditorContext, options: RecordEditOptions, awaits = false) {
  const graph = ctx.graph
  const pageId = options.pageId ?? ctx.state.currentPageId
  const finish = captureDocumentChange(graph, pageId)
  // A synchronous edit runs alone; one that awaits shares the document while it waits.
  const othersWrote = awaits ? watchOtherWrites(ctx) : () => false
  return (failed: boolean) => {
    const others = othersWrote()
    const change = finish()
    const empty = isEmptyDocumentChange(change)
    if (
      failed &&
      options.rollbackOnThrow &&
      !empty &&
      !others &&
      options.canRollBack?.() !== false &&
      rollBack(ctx, graph, change)
    ) {
      options.onRecorded?.(unchanged(pageId))
      return
    }
    // An edit that changed nothing, such as a read-only script, leaves no empty step behind.
    if (options.push !== false && !empty) {
      const entry = {
        label: options.label,
        forward: () => restoreDocumentChange(ctx, change, 'after'),
        inverse: () => restoreDocumentChange(ctx, change, 'before')
      }
      if (options.ownStep) ctx.undo.pushStep(entry)
      else ctx.undo.push(entry)
    }
    options.onRecorded?.(change)
  }
}

/**
 * Runs a synchronous edit as one undo step of everything it changed in the document, also when
 * it throws part way, so what it did stays undoable, unless `rollbackOnThrow` puts it back. Its
 * step is recorded in the same task as its changes, as the document's unsaved state expects of an
 * edit, and joins a batch open around it.
 */
export function recordEdit<T>(ctx: EditorContext, options: RecordEditOptions, run: () => T): T {
  const finish = begin(ctx, options)
  let failed = true
  try {
    const result = run()
    failed = false
    return result
  } finally {
    finish(failed)
  }
}

/**
 * Runs an edit that awaits before it finishes, such as an agent's tool call that loads fonts or
 * runs a layout, as one undo step. The edit stays open until its step is recorded, so the changes
 * it makes meanwhile count as its own rather than as edits outside the history. An edit made
 * elsewhere while it runs, such as the user's, lands in the same step: nothing tells whose write
 * is whose across an await. So `rollbackOnThrow` rolls back only an edit nothing else wrote
 * beside, as far as the history and `canRollBack` can tell, and otherwise records its step. An
 * edit that can compute first and apply in one go records only the apply with `recordEdit`
 * instead.
 */
export async function recordEditAsync<T>(
  ctx: EditorContext,
  options: RecordEditOptions,
  run: () => Promise<T>
): Promise<T> {
  // Capturing can throw; the edit opens only once it has, so a failure never leaves it open.
  const finish = begin(ctx, { ...options, ownStep: true }, true)
  const close = ctx.undo.openEdit()
  let failed = true
  try {
    const result = await run()
    failed = false
    return result
  } finally {
    try {
      finish(failed)
    } finally {
      close()
    }
  }
}

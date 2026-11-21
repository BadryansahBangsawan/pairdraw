import { executeAtomicTool, isEmptyDocumentChange, type DocumentChange } from '@pairdraw/core'
import {
  createDesignGuard,
  DesignMemoryRefusalError,
  type DesignMemoryMode
} from '@pairdraw/core/design-memory'
import type { FigmaAPI } from '@pairdraw/core/figma-api'
import { isAtomicTool, toolChangesDocument, toolFailure, type ToolDef } from '@pairdraw/core/tools'
import type { SceneMutationImpact } from '@pairdraw/scene-graph/mutation-impact'

import { showAIEdit, type AIEditDocument } from '@/app/ai/motion'
import {
  AI_UNDO_PREFIX,
  markRunChange,
  moveRunToPage,
  recordRunBaseline,
  recordRunUndoEntry,
  type Run
} from '@/app/ai/reply/run'
import {
  acquireDocumentEdit,
  AUTOMATION_UNDO_LABEL,
  loadAtomicToolFonts
} from '@/app/automation/execution/editor'
import { noOutsideWritesSince } from '@/app/document/io/outside-writes'
import type { EditorStore } from '@/app/editor/active-store'
import { ensureGraphFonts } from '@/app/editor/fonts'
import { activeTab, getTabForStore, switchTab } from '@/app/tabs'

import { recordToolChange } from './changes/capture'

/**
 * Where an edit's document is: its notice names it while another document is in front, and Show
 * brings it to front so the layers it selects and zooms are the ones the person then sees.
 */
function editDocument(store: EditorStore): AIEditDocument {
  const tab = getTabForStore(store)
  return {
    name: () => (tab && activeTab.value?.id !== tab.id ? tab.store.state.documentName : null),
    show: () => {
      if (tab) switchTab(tab.id)
    }
  }
}

/** The reply a call belongs to: its run, and the call's id in the reply's transcript. */
export interface ReplyCall {
  run: Run
  toolCallId: string
}

/** One call of a Pairdraw tool, from the built-in chat, a coding agent, or another client. */
export interface EditorToolCall {
  store: EditorStore
  figma: FigmaAPI
  def: ToolDef
  args: Record<string, unknown>
  /** The chat reply the call belongs to; a call from an outside client belongs to none. */
  reply?: ReplyCall | null
  /** What a call outside a reply labels its undo entry with, such as `Agent` or `WebMCP`. */
  source?: string
  signal?: AbortSignal
  /** False once the call's document closed, so a late edit is not drawn. */
  isLive?: () => boolean
  /**
   * How the document's design memory answers the call: `refuse`, the default, for agents, or
   * `warn` for a call a person made, such as a CLI command, which it never undoes.
   */
  designMemory?: DesignMemoryMode
}

const STOPPED_BEFORE_CALL = 'Stopped before this call ran; nothing was changed.'

/**
 * The page a call writes to: a parent or a replaced layer on another page puts the new layers
 * there, so that page lays out, loads their fonts, and records the change.
 */
function writtenPageId(figma: FigmaAPI, args: Record<string, unknown>): string {
  // As render places it: a replaced layer's parent wins over parent_id.
  const nodeId = args.replace_id ?? args.parent_id
  const page =
    typeof nodeId === 'string'
      ? figma.graph.closest(nodeId, (node) => node.type === 'CANVAS')
      : undefined
  return page?.id ?? figma.currentPageId
}

/**
 * The outermost layers an edit created or changed, whose text needs its fonts before layout;
 * the whole page when the edit reported no change at all.
 */
function fontScope(store: EditorStore, pageId: string, impact: SceneMutationImpact): string[] {
  const { graph } = store
  if (impact.changedNodeIds.size === 0) return graph.getNode(pageId)?.childIds ?? []
  const changed = new Set([...impact.changedNodeIds].filter((id) => graph.getNode(id)))
  return [...changed].filter((id) => {
    const parentId = graph.getNode(id)?.parentId
    return !parentId || !graph.closest(parentId, (node) => changed.has(node.id))
  })
}

async function execute(call: EditorToolCall, pageId: string): Promise<unknown> {
  const { store, figma, def, args } = call
  return store.runMutationWithLayout(
    () => def.execute(figma, args),
    pageId,
    async (_result, impact) => {
      const nodeIds = fontScope(store, pageId, impact)
      if (nodeIds.length > 0) await ensureGraphFonts(store.graph, nodeIds, store.renderer)
    }
  )
}

/** Records a reply's call once it ran: its undo entry, its change, and where its agent worked. */
async function recordReplyCall(
  call: EditorToolCall,
  reply: ReplyCall,
  change: DocumentChange,
  undoBefore: ReturnType<EditorStore['undo']['peekUndo']>,
  viewPageId: string
): Promise<void> {
  const { store, figma, def } = call
  const { run, toolCallId } = reply
  if (!isEmptyDocumentChange(change)) run.changedCalls.add(toolCallId)
  recordRunUndoEntry(store, run, { tool: def.name, toolCallId }, undoBefore)
  // View tools (selection, viewport, pages) cannot change the document.
  if (toolChangesDocument(def)) {
    try {
      recordToolChange(store, toolCallId, change)
    } catch (error) {
      // The change record is a review aid; the edit and its undo entry already stand.
      console.warn('Could not record AI tool change', error)
    }
    // The agent shows where it edited, even on another page; layers the result names refine
    // this once the call returns.
    markRunChange(store, change)
  }
  // `switch_page` moves the run, and the user's view with it.
  if (figma.currentPageId !== viewPageId) await moveRunToPage(store, run, figma.currentPageId)
}

/** Runs an edit while its document's lock is held, and records it. */
async function editAndRecord(call: EditorToolCall, reply: ReplyCall | null): Promise<unknown> {
  const { store, figma, def, args } = call
  const viewPageId = figma.currentPageId
  const pageId = writtenPageId(figma, args)
  // A reply's first edit to a page keeps the whole page, which `changeBaseline` diffs.
  if (reply && toolChangesDocument(def) && !reply.run.baselines.has(pageId)) {
    recordRunBaseline(reply.run, store.snapshotPage(pageId))
  }
  const prefix = reply ? AI_UNDO_PREFIX : (call.source ?? AUTOMATION_UNDO_LABEL)
  const undoBefore = store.undo.peekUndo()
  const recorded: { change?: DocumentChange } = {}
  const options = {
    label: `${prefix}: ${def.name}`,
    pageId,
    onRecorded: (change: DocumentChange) => {
      recorded.change = change
    }
  }
  // Calls here are agents' and automation's, never edits in the editor, so the document's
  // design memory judges what they changed: an off-system value it refuses puts the edit back.
  const guard = createDesignGuard(store.graph, {
    content: def.content,
    args,
    mode: call.designMemory
  })
  try {
    if (isAtomicTool(def)) {
      // An atomic tool commits its own step at once; loading its fonts after is not part of it.
      const result = store.recordEdit({ ...options, push: false }, () =>
        executeAtomicTool(store, figma, def, args, {
          label: prefix,
          signal: call.signal,
          isLive: call.isLive,
          verify: guard.verifyFields
        })
      )
      await loadAtomicToolFonts(store, figma, args, { isLive: call.isLive })
      return guard.annotate(result)
    }
    // A structural call that throws part way is put back whole, as an atomic tool's is, unless
    // the room wrote to the document while it ran.
    const result = await store.recordEditAsync(
      {
        ...options,
        rollbackOnThrow: true,
        canRollBack: noOutsideWritesSince(store),
        verify: guard.verifyChange
      },
      () => execute(call, pageId)
    )
    return guard.annotate(result)
  } catch (error) {
    // The edit is already put back; the agent reads why, and the chat offers to allow the values.
    if (error instanceof DesignMemoryRefusalError) return error.toResult()
    throw error
  } finally {
    if (reply && recorded.change) {
      await recordReplyCall(call, reply, recorded.change, undoBefore, viewPageId)
    }
    // A late edit to a document that closed meanwhile is not drawn.
    if (recorded.change && toolChangesDocument(def) && call.isLive?.() !== false) {
      showAIEdit(store, recorded.change, reply, editDocument(store))
    }
  }
}

/**
 * Runs one call of a Pairdraw tool. An edit runs alone in its document, is recorded as one
 * undo entry, and, for a call that belongs to a chat reply, joins the reply's run so the reply
 * can revert it and the transcript shows what it changed.
 */
export async function runEditorTool(call: EditorToolCall): Promise<unknown> {
  const { store, figma, def, args } = call
  if (!def.mutates) return def.execute(figma, args)
  // Fonts load before the edit takes its turn, so an edit never waits on the network.
  try {
    await def.loadFonts(figma, args)
  } catch (error) {
    return toolFailure(error)
  }
  const reply = call.reply ?? null
  // Each document's edits run one at a time, since whole-page snapshots must not interleave.
  const release = await acquireDocumentEdit(store)
  // Whatever fails from here, the lock and the reply's count of running tools are released.
  let began = false
  try {
    // Cancelled while waiting for its turn, as a WebMCP call can be: nothing is edited.
    call.signal?.throwIfAborted()
    // Stopped while waiting for its turn: the reply is over, so nothing more is edited.
    if (reply && !reply.run.active) return { error: STOPPED_BEFORE_CALL }
    if (reply) {
      reply.run.beginTool()
      began = true
    }
    return await editAndRecord(call, reply)
  } finally {
    release()
    if (began) reply?.run.endTool()
  }
}

import { watchDebounced } from '@vueuse/core'
import type { WatchHandle } from 'vue'

import {
  deleteDraft,
  draftExists,
  writeDraft,
  type DraftWriteInput
} from '@/app/document/drafts/store'
import { createCanvasId } from '@/app/storage/id'

/** Where drafts are written; the local canvas store unless a test passes its own. */
export type DraftWriter = {
  write(input: DraftWriteInput): Promise<unknown>
  remove(id: string): Promise<void>
  /** Whether the draft is still kept; one deleted elsewhere, such as from another window, is not. */
  exists?(id: string): Promise<boolean>
}

const localDrafts: DraftWriter = { write: writeDraft, remove: deleteDraft, exists: draftExists }

interface DocumentDraftOptions {
  state: { documentName: string }
  /** Captures the document's content revision, as a save records it. */
  version: () => number
  buildFigFile: () => Promise<Uint8Array> | Uint8Array
  /** Whether the document has nowhere else to keep its changes: no file, storage, or download. */
  isSourceless: () => boolean
  isEnabled: () => boolean
  /** Counts the document saved up to this revision, which its draft now holds. */
  markSaved: (version: number) => void
  /** Runs after each draft write, such as dropping the recovery copy the draft replaces. */
  onPersisted?: () => Promise<void> | void
  writer?: DraftWriter
  createId?: () => string
}

export interface DocumentDraftController {
  /** The draft holding the document, once its first change was written. */
  getDraftId(): string | null
  /** Whether the draft keeps the document's changes now, so nothing else needs to. */
  keepsChanges(): boolean
  /** Ties the document to the draft it was opened from, as it is now. */
  adopt(id: string): void
  persistNow(): Promise<void>
  /** Drops the draft once the document saves elsewhere: to a file, storage, or a download. */
  release(): Promise<void>
  /**
   * Drops what this document added, as closing without keeping it does: a draft it started goes,
   * while a draft it was opened from keeps what it last held.
   */
  discard(): Promise<void>
  /** Holds drafting while the document is someone else's, such as a joined room's. */
  suspend(suspended: boolean): void
  dispose(): void
}

/**
 * Keeps a new document's changes as a draft on this device, so it needs no saving: each change
 * is written shortly after it is made and counts the document saved. The draft goes once the
 * document is saved to a place of its own.
 */
export function createDocumentDraft({
  state,
  version: currentVersion,
  buildFigFile,
  isSourceless,
  isEnabled,
  markSaved,
  onPersisted,
  writer = localDrafts,
  createId = createCanvasId
}: DocumentDraftOptions): DocumentDraftController {
  let draftId: string | null = null
  // An untouched document is no draft; its first change makes it one.
  let persistedVersion = currentVersion()
  let queuedVersion = persistedVersion
  let generation = 0
  let writing: Promise<void> | null = null
  let suspended = false
  let failed = false
  let disposed = false
  // Opened from Home: the draft held work before this document, so discarding keeps it.
  let adopted = false
  // Deleted elsewhere while open: writing again would bring it back.
  let deleted = false

  const active = () => !disposed && !deleted && !suspended && isEnabled() && isSourceless()

  async function writeQueued(writeGeneration: number): Promise<void> {
    while (queuedVersion > persistedVersion) {
      if (writeGeneration !== generation || !active()) return
      const version = queuedVersion
      const bytes = await buildFigFile()
      if (writeGeneration !== generation || !active()) return
      const id = draftId ?? createId()
      if (draftId && writer.exists && !(await writer.exists(draftId))) {
        if (writeGeneration !== generation) return
        // The draft was deleted elsewhere; the document's changes go back to recovery's care.
        deleted = true
        draftId = null
        return
      }
      if (writeGeneration !== generation) return
      try {
        await writer.write({ id, name: state.documentName, figBytes: bytes })
      } catch (error) {
        failed = true
        throw error
      }
      if (writeGeneration !== generation) {
        // The document took another draft or dropped this one meanwhile; a row this write
        // started is no draft of it.
        if (id !== draftId) await writer.remove(id)
        return
      }
      failed = false
      draftId = id
      persistedVersion = version
      markSaved(version)
      await onPersisted?.()
    }
  }

  async function persistNow(): Promise<void> {
    while (active()) {
      queuedVersion = Math.max(queuedVersion, currentVersion())
      if (queuedVersion <= persistedVersion) return
      if (writing) {
        // A write from before the draft was adopted or removed lands nothing; go again after it.
        await writing
        continue
      }
      await startWrite()
      return
    }
  }

  function startWrite(): Promise<void> {
    const started = writeQueued(generation).finally(() => {
      writing = null
    })
    writing = started
    return started
  }

  /** Stops a write in flight from landing, so a removed draft does not come back. */
  async function settle(): Promise<void> {
    generation++
    await writing?.catch(() => undefined)
  }

  async function remove(): Promise<void> {
    await settle()
    const id = draftId
    draftId = null
    adopted = false
    persistedVersion = currentVersion()
    queuedVersion = persistedVersion
    if (id) await writer.remove(id)
  }

  const stopWatch: WatchHandle = watchDebounced(
    currentVersion,
    () => {
      void persistNow().catch((error) => console.warn('[Drafts] Saving the draft failed:', error))
    },
    { debounce: 2000, maxWait: 10000 }
  )

  return {
    getDraftId: () => draftId,
    keepsChanges: () => active() && !failed,
    adopt(id) {
      generation++
      draftId = id
      adopted = true
      deleted = false
      failed = false
      persistedVersion = currentVersion()
      queuedVersion = persistedVersion
    },
    persistNow,
    async release() {
      // A write in flight may still create the draft, so it is settled before anything goes.
      if (isSourceless() || (!draftId && !writing)) return
      await remove()
    },
    async discard() {
      if (!adopted) {
        await remove()
        return
      }
      // A write in flight lands nothing; the draft keeps what it last held.
      await settle()
    },
    suspend(value) {
      suspended = value
    },
    dispose() {
      disposed = true
      generation++
      stopWatch()
    }
  }
}

import { watchDebounced } from '@vueuse/core'
import { watch, type WatchHandle } from 'vue'

import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { getRecoveryStore } from '@/app/document/recovery/store'
import type { RecoveryStore } from '@/app/document/recovery/types'
import { createCanvasId } from '@/app/storage/id'

interface DocumentRecoveryOptions {
  state: { documentName: string }
  /** The document's content revision; rendering and layout do not advance it. */
  version: () => number
  buildFigFile: () => Promise<Uint8Array> | Uint8Array
  hasWritableSource: () => boolean
  /**
   * The file the document saves to, when it has one: its unsaved changes are kept as a backup of
   * that file, offered when the file opens again.
   */
  fileSource?: () => DocumentSourceIdentity | null
  /** Whether autosave writes the file's changes itself, so only an explicit persist backs them up. */
  autosaveCovers?: () => boolean
  /** Whether the document keeps its changes elsewhere, such as in its draft, so it needs no copy. */
  keptElsewhere?: () => boolean
  /**
   * Whether the document differs from where it was saved or started. A revision that leaves it
   * there, such as undoing back, leaves nothing to recover.
   */
  hasChanges?: () => boolean
  isEnabled?: () => boolean
  store?: RecoveryStore
  recoveryId?: string
}

export interface DocumentRecoveryController {
  getRecoveryId(): string
  /** Whether the document came from a copy this device kept, such as a restored recovery one. */
  hasAdoptedCopy(): boolean
  adoptRecoverySnapshot(id: string): Promise<void>
  persistNow(): Promise<void>
  markProtectedVersion(version: number): Promise<void>
  discardRecovery(): Promise<void>
  disposeRecovery(): void
}

export function createDocumentRecovery({
  state,
  version: currentVersion,
  buildFigFile,
  hasWritableSource,
  fileSource = () => null,
  autosaveCovers = () => false,
  keptElsewhere = () => false,
  hasChanges = () => true,
  isEnabled = () => true,
  store = getRecoveryStore(),
  recoveryId = createCanvasId()
}: DocumentRecoveryOptions): DocumentRecoveryController {
  let id = recoveryId
  let protectedVersion = currentVersion()
  let persistedVersion: number | null = null
  // A document opened from a kept copy is not the empty design its tab started with.
  let adoptedCopy = false
  let requestedVersion = protectedVersion
  let lifecycleGeneration = 0
  let writing: Promise<void> | null = null
  let cleanup: Promise<void> = Promise.resolve()
  let disposed = false

  /**
   * What the copy is for: a document with no source gets a recovery copy, a file a backup of its
   * unsaved changes; null when the document's changes are kept by its storage or its draft.
   */
  function copyTarget(): { source: DocumentSourceIdentity | null } | null {
    if (keptElsewhere()) return null
    const file = fileSource()
    if (file) return { source: file }
    return hasWritableSource() ? null : { source: null }
  }

  async function runWrites(generation: number): Promise<void> {
    if (disposed || generation !== lifecycleGeneration || !isEnabled()) return
    if (!copyTarget() || requestedVersion === protectedVersion || !hasChanges()) return
    const version = requestedVersion
    const bytes = await buildFigFile()
    const target = copyTarget()
    if (generation !== lifecycleGeneration || !target || !isEnabled()) return
    await store.write({
      id,
      documentName: state.documentName,
      figBytes: bytes,
      source: target.source
    })
    persistedVersion = version
    if (generation !== lifecycleGeneration) return
    protectedVersion = version
    if (requestedVersion !== version) await runWrites(generation)
  }

  async function persistNow(): Promise<void> {
    await cleanup
    if (disposed || !copyTarget() || !isEnabled()) return
    requestedVersion = currentVersion()
    if (requestedVersion === protectedVersion) return
    if (!hasChanges()) return protect(requestedVersion)
    if (!writing) {
      const generation = lifecycleGeneration
      writing = runWrites(generation).finally(() => {
        writing = null
      })
    }
    await writing
  }

  const stopVersionWatch: WatchHandle = watchDebounced(
    currentVersion,
    () => {
      // Autosave writes a file's changes within the same wait, so a backup would only repeat it.
      if (copyTarget()?.source && autosaveCovers()) return
      void persistNow().catch((error) => console.warn('[Recovery] Snapshot failed:', error))
    },
    { debounce: 3000, maxWait: 10000 }
  )

  // Edits autosave had not written yet stay unsaved once it stops, so a file gets its backup now
  // rather than at the next edit, which a crash may not allow.
  const stopAutosaveWatch: WatchHandle = watch(autosaveCovers, (covering) => {
    if (covering || !copyTarget()?.source) return
    void persistNow().catch((error) => console.warn('[Recovery] Snapshot failed:', error))
  })

  const stopEnabledWatch: WatchHandle = watch(
    isEnabled,
    (enabled) => {
      if (enabled) {
        protectedVersion = currentVersion()
        requestedVersion = currentVersion()
        return
      }
      lifecycleGeneration++
      const cleanupGeneration = lifecycleGeneration
      const snapshotId = id
      requestedVersion = currentVersion()
      protectedVersion = currentVersion()
      const activeWrite = writing
      cleanup = cleanup
        .then(async () => {
          await activeWrite
          await store.remove(snapshotId)
          if (cleanupGeneration === lifecycleGeneration) persistedVersion = null
          return undefined
        })
        .catch((error) => console.warn('[Recovery] Failed to disable recovery:', error))
    },
    { flush: 'sync' }
  )

  async function invalidateActiveWrite(): Promise<void> {
    lifecycleGeneration++
    await Promise.all([writing, cleanup])
  }

  /** The document as of `version` is kept elsewhere or needs no keeping: a copy up to it goes. */
  async function protect(version: number): Promise<void> {
    await invalidateActiveWrite()
    protectedVersion = version
    requestedVersion = currentVersion()
    if (persistedVersion == null || persistedVersion <= version) {
      await store.remove(id)
      persistedVersion = null
    }
  }

  return {
    getRecoveryId: () => id,
    hasAdoptedCopy: () => adoptedCopy,
    async adoptRecoverySnapshot(nextId) {
      const previousId = id
      await invalidateActiveWrite()
      adoptedCopy = true
      id = nextId
      // The adopted snapshot holds the document as it is now.
      const version = currentVersion()
      protectedVersion = version
      persistedVersion = version
      requestedVersion = version
      disposed = false
      if (previousId !== nextId) await store.remove(previousId)
    },
    persistNow,
    markProtectedVersion: protect,
    async discardRecovery() {
      await invalidateActiveWrite()
      protectedVersion = currentVersion()
      persistedVersion = null
      requestedVersion = currentVersion()
      await store.remove(id)
    },
    disposeRecovery() {
      disposed = true
      lifecycleGeneration++
      stopVersionWatch()
      stopAutosaveWatch()
      stopEnabledWatch()
    }
  }
}

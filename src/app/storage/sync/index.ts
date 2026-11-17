import { stopSyncEngine } from './engine'
import { resetOutboxForTests as resetOutbox, type Outbox } from './outbox'

/**
 * Swaps the outbox for a test and stops the drain the previous one scheduled, so no job of an
 * earlier test runs during a later one.
 */
export function resetOutboxForTests(outbox?: Outbox): void {
  stopSyncEngine()
  resetOutbox(outbox)
}

export { enqueueDeleteCanvas, kickSyncEngine, resumeStorageSync, stopSyncEngine } from './engine'
export {
  adoptStoredVersion,
  dropCanvasUploads,
  keepBothVersions,
  replaceStoredVersion,
  takeStoredVersion
} from './conflicts'
export { followUpload } from './follow'
export { createMemoryOutbox, getOutbox } from './outbox'
export { persistStorageCanvasLocally } from './persist'
export { setUploadProgress, uploadProgressByCanvas } from './progress'
export { pendingSyncCount, syncUIState } from './status'

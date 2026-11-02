import { requestDiskChangeChoice, type DiskChangeRequest } from './prompt'

type DiskChangeGuardOptions = {
  hasUnsavedChanges: () => boolean
  getDocumentName: () => string
  reloadFromDisk: () => void
  ask?: (documentName: string) => DiskChangeRequest
}

/**
 * Decides what a change to the document's file on disk does. A document without unsaved edits
 * reloads at once; one with unsaved edits asks first, so a reload never discards them silently.
 * Ignoring keeps the edits, and the next save writes them over the file.
 */
export function createDiskChangeGuard({
  hasUnsavedChanges,
  getDocumentName,
  reloadFromDisk,
  ask = requestDiskChangeChoice
}: DiskChangeGuardOptions) {
  let pending: DiskChangeRequest | null = null
  // The file the question is about; a path on desktop, a file handle in the browser.
  let target: unknown = null

  async function onDiskChange(): Promise<void> {
    // Further changes while the question is open are answered by the same choice.
    if (pending) return
    if (!hasUnsavedChanges()) {
      reloadFromDisk()
      return
    }
    const request = ask(getDocumentName())
    pending = request
    const choice = await request.choice
    // A withdrawn question was cleared before it was answered, and its answer means nothing.
    if (pending !== request) return
    pending = null
    if (choice === 'reload') reloadFromDisk()
  }

  function withdraw(): void {
    const request = pending
    pending = null
    request?.withdraw()
  }

  /**
   * Records the file the document now watches. A question about another file, such as the one
   * it followed before Save As elsewhere, is withdrawn: answering Reload would read the new file.
   */
  function follow(next: unknown): void {
    if (next !== target) withdraw()
    target = next
  }

  return {
    onDiskChange,
    withdraw,
    follow,
    /** Whether a question is open; autosave waits for it so it never overwrites the change. */
    isPending: () => pending !== null
  }
}

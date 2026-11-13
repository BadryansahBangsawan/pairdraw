import { noop } from 'es-toolkit/function'
import { watch } from 'vue'

import { allTabs, getTabsSnapshot } from '@/app/tabs'
import { isTauri } from '@/app/tauri/env'

function openDocumentPaths(): string[] {
  return getTabsSnapshot()
    .map((tab) => tab.store.getSourceIdentity().path)
    .filter((path): path is string => path !== null)
}

/**
 * Sends `path` to the window that already shows it. True when this window must not open it: the
 * shell focused the owner and asked it to show the tab.
 */
export async function focusDocumentWindow(path: string): Promise<boolean> {
  if (!isTauri()) return false
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<boolean>('focus_document_window', { path })
}

/** The claims to add and release when the window's open paths change from `claimed` to `paths`. */
export function claimChanges(
  claimed: ReadonlySet<string>,
  paths: readonly string[]
): { added: string[]; removed: string[] } {
  const next = new Set(paths)
  return {
    added: [...next].filter((path) => !claimed.has(path)),
    removed: [...claimed].filter((path) => !next.has(path))
  }
}

/** The shell calls that record which window shows which file. */
export interface DocumentRegistry {
  claim: (path: string) => Promise<void>
  release: (path: string) => Promise<void>
}

const nativeRegistry: DocumentRegistry = {
  claim: async (path) => {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('claim_document', { path })
  },
  release: async (path) => {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('release_document', { path })
  }
}

async function sendChange(action: (path: string) => Promise<void>, path: string): Promise<boolean> {
  try {
    await action(path)
    return true
  } catch (error) {
    // One path failing must not stop the paths after it or the next update, which retries it.
    console.warn('[Window] Failed to update the open-document registry:', error)
    return false
  }
}

/**
 * Applies claim and release changes in order, one path at a time. A change takes effect locally
 * only once the shell accepted it, so a rejected claim is retried by the next update instead of
 * staying unclaimed for the window's lifetime.
 */
export function createDocumentClaimQueue(registry: DocumentRegistry) {
  const claimed = new Set<string>()
  let tail: Promise<void> = Promise.resolve()

  return {
    update(paths: readonly string[]): Promise<void> {
      const next = new Set(paths)
      const step = tail.then(async () => {
        const { added, removed } = claimChanges(claimed, [...next])
        for (const path of added) {
          if (await sendChange(registry.claim, path)) claimed.add(path)
        }
        for (const path of removed) {
          if (await sendChange(registry.release, path)) claimed.delete(path)
        }
        return undefined
      })
      // A failed step must not stall later updates for this window.
      tail = step.catch(noop)
      return step
    }
  }
}

/**
 * Keeps the shell's document registry in step with this window's tabs: a file open in a tab is
 * claimed by this window, so a file association or link for it focuses this window instead of
 * opening a second copy. Only the realm knows which file a tab shows, which is why the frontend
 * fills the registry (`desktop/src/launch/documents.rs`).
 */
export function watchOpenDocuments(): () => void {
  if (!isTauri()) return noop

  const queue = createDocumentClaimQueue(nativeRegistry)
  return watch(
    allTabs,
    () => {
      void queue.update(openDocumentPaths())
    },
    { immediate: true }
  )
}

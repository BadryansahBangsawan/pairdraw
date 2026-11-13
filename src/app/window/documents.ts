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

/**
 * Keeps the shell's document registry in step with this window's tabs: a file open in a tab is
 * claimed by this window, so a file association or link for it focuses this window instead of
 * opening a second copy. Only the realm knows which file a tab shows, which is why the frontend
 * fills the registry (`desktop/src/launch/documents.rs`).
 */
export function watchOpenDocuments(): () => void {
  if (!isTauri()) return noop

  let claimed = new Set<string>()
  let sync: Promise<void> = Promise.resolve()

  function update(paths: string[]): Promise<void> {
    const { added, removed } = claimChanges(claimed, paths)
    claimed = new Set(paths)
    sync = sync.then(async () => {
      const { invoke } = await import('@tauri-apps/api/core')
      for (const path of added) await invoke('claim_document', { path })
      for (const path of removed) await invoke('release_document', { path })
      return undefined
    })
    return sync
  }

  return watch(
    allTabs,
    () => {
      void update(openDocumentPaths()).catch((error: unknown) => {
        console.warn('[Window] Failed to update the open-document registry:', error)
      })
    },
    { immediate: true }
  )
}

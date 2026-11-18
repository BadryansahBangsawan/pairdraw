import { invoke } from '@tauri-apps/api/core'
import { watch } from 'vue'

import { recentLocalFilePaths } from '@/app/recent-files'
import { isTauri } from '@/app/tauri/env'

export const OPEN_RECENT_EVENT_PREFIX = 'open-recent:'

/**
 * Keeps File › Open Recent in step with the recent files. The app installs it once, so a change
 * made anywhere — saving, opening, clearing, or removing a file, and on Home as much as in the
 * editor — reaches the menu; a view that mounts later has nothing left to sync.
 */
export function installRecentFilesMenu(): () => void {
  if (!isTauri()) return () => undefined
  let pushed: string | null = null

  async function push(paths: readonly string[]): Promise<void> {
    const next = JSON.stringify(paths)
    // A save reports a newer date for a file already listed, which changes nothing in the menu.
    if (next === pushed) return
    await invoke('set_recent_files', { paths: [...paths] })
    pushed = next
  }

  return watch(
    recentLocalFilePaths,
    (paths) => {
      void push(paths).catch((error) => {
        // The next change pushes the whole list again, so a failed push needs no retry here.
        console.warn('[Recent files] Failed to update the native menu', error)
      })
    },
    { immediate: true }
  )
}

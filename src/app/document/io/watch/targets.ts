import { useIntervalFn } from '@vueuse/core'

const RECENT_WRITE_MS = 1000
const BROWSER_POLL_MS = 2000
const TAURI_WATCH_DELAY_MS = 500

export async function watchTauriFile(
  filePath: string,
  getLastWriteTime: () => number,
  onDiskChange: () => void
) {
  const { watch: tauriWatch } = await import('@tauri-apps/plugin-fs')
  const unwatch = await tauriWatch(
    filePath,
    (event) => {
      if (typeof event.type !== 'object' || !('modify' in event.type)) return
      // macOS rewrites a file's metadata, such as its last-used date, when it is opened; only a
      // change to its contents means the document on screen is out of date.
      if (event.type.modify.kind === 'metadata') return
      if (Date.now() - getLastWriteTime() < RECENT_WRITE_MS) return
      onDiskChange()
    },
    { delayMs: TAURI_WATCH_DELAY_MS }
  )
  return () => unwatch()
}

export interface WatchBrowserFileOptions {
  /** How often the handle is read; a test passes a shorter span. */
  pollMs?: number
}

export async function watchBrowserFile(
  fileHandle: FileSystemFileHandle,
  getActiveFileHandle: () => FileSystemFileHandle | null,
  getLastWriteTime: () => number,
  onDiskChange: () => void,
  stopWatchingFile: () => void,
  options: WatchBrowserFileOptions = {}
) {
  let lastModified = (await fileHandle.getFile()).lastModified
  const { pause, resume } = useIntervalFn(
    () => {
      // A hidden tab shows nothing a change on disk would update, and the first tick after it is
      // shown reads the file anyway, so it is not read in the background at all.
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void checkBrowserFileModified(fileHandle)
      }
    },
    options.pollMs ?? BROWSER_POLL_MS,
    { immediate: false }
  )
  resume()

  async function checkBrowserFileModified(handle: FileSystemFileHandle) {
    if (getActiveFileHandle() !== handle) {
      stopWatchingFile()
      return
    }
    try {
      const file = await handle.getFile()
      if (file.lastModified > lastModified) {
        lastModified = file.lastModified
        if (Date.now() - getLastWriteTime() < RECENT_WRITE_MS) return
        onDiskChange()
      }
    } catch {
      stopWatchingFile()
    }
  }

  return pause
}

import { watchBrowserFile, watchTauriFile } from '@/app/document/io/watch/targets'
import { IS_TAURI } from '@/constants'

type FileWatchOptions = {
  getFilePath: () => string | null
  getFileHandle: () => FileSystemFileHandle | null
  getLastWriteTime: () => number
  onDiskChange: () => void
}

export function createFileWatcher({
  getFilePath,
  getFileHandle,
  getLastWriteTime,
  onDiskChange
}: FileWatchOptions) {
  let unwatchFile: (() => void) | null = null

  function stopWatchingFile() {
    if (unwatchFile) {
      unwatchFile()
      unwatchFile = null
    }
  }

  async function startWatchingFile() {
    stopWatchingFile()
    const filePath = getFilePath()
    const fileHandle = getFileHandle()

    if (filePath && IS_TAURI) {
      unwatchFile = await watchTauriFile(filePath, getLastWriteTime, onDiskChange)
    } else if (fileHandle) {
      unwatchFile = await watchBrowserFile(
        fileHandle,
        getFileHandle,
        getLastWriteTime,
        onDiskChange,
        stopWatchingFile
      )
    }
  }

  return { startWatchingFile, stopWatchingFile }
}

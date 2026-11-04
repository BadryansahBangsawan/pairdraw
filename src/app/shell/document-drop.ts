import { useEventListener } from '@vueuse/core'

import { isDocumentFontFileName } from '@open-pencil/core/text'
import { filterCanvasFiles } from '@open-pencil/vue/canvas/drop'

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { importDroppedFonts } from '@/app/editor/fonts/document'
import { isDesignTokenFileName } from '@/app/editor/tokens/design-tokens'
import { importTokenFiles } from '@/app/editor/tokens/dialog'
import { openDesignFile, openDesignFileBatch } from '@/app/shell/menu/files'

interface DroppedFile {
  file: File
  handle: Promise<FileSystemFileHandle | null>
}

/** The files targets inside the window took from a drop that goes on to the window. */
const claimedFiles = new WeakMap<Event, File[]>()

/**
 * Records that a target inside the window, such as the chat, took `files` from the drop `event`,
 * so the window opens the rest of a mixed drop without reporting these as documents it cannot
 * open.
 */
export function claimDroppedFiles(event: Event, files: readonly File[]): void {
  claimedFiles.set(event, [...(claimedFiles.get(event) ?? []), ...files])
}

/** A dropped file read again may be a new `File`, so the same file is told by what it holds. */
function sameFile(a: File, b: File): boolean {
  return (
    a.name === b.name && a.size === b.size && a.type === b.type && a.lastModified === b.lastModified
  )
}

/** The dropped entries no target inside the window has claimed, each claim matching once. */
export function unclaimedDroppedFiles<T extends { file: File }>(event: Event, dropped: T[]): T[] {
  const claimed = [...(claimedFiles.get(event) ?? [])]
  if (claimed.length === 0) return dropped
  return dropped.filter(({ file }) => {
    const index = claimed.findIndex((other) => sameFile(other, file))
    if (index === -1) return true
    claimed.splice(index, 1)
    return false
  })
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

/** A file handle lets the tab save back to the dropped file; only Chromium provides one. */
async function fileHandle(item: DataTransferItem): Promise<FileSystemFileHandle | null> {
  if (!item.getAsFileSystemHandle) return null
  try {
    const handle = await item.getAsFileSystemHandle()
    return handle instanceof FileSystemFileHandle ? handle : null
  } catch {
    return null
  }
}

/**
 * The dropped files and their handles. The drag data is only readable while the drop event
 * runs, so every file and handle request is taken before anything awaits.
 */
function droppedFiles(transfer: DataTransfer): DroppedFile[] {
  const dropped: DroppedFile[] = []
  for (const item of transfer.items) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) dropped.push({ file, handle: fileHandle(item) })
  }
  return dropped
}

/**
 * Opens documents dropped anywhere on the window in new tabs, as File → Open does. Images and
 * SVG files stay with the canvas, which places them; design token files open the variables
 * import of the document in view; files a target inside the window took, such as text files
 * attached to the chat, stay with it; any other file reports that it cannot be opened instead of
 * being ignored.
 */
export function useDocumentDrop() {
  useEventListener(window, 'dragover', (event: DragEvent) => {
    if (!hasFiles(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  })

  useEventListener(window, 'drop', (event: DragEvent) => {
    if (!event.dataTransfer || !hasFiles(event)) return
    // Without this the browser would navigate away to show the file.
    event.preventDefault()
    // Classify each file itself: `getAsFile()` may return a new `File`, not one from `files`.
    // Files a target such as the chat took from a mixed drop are left to it.
    const dropped = unclaimedDroppedFiles(event, droppedFiles(event.dataTransfer)).filter(
      ({ file }) => filterCanvasFiles([file]).length === 0
    )
    // Token files are imported into the open document's variables, as its Import button does.
    // Font files are registered for the open document, as its FontPicker offers them.
    const tokens = dropped.filter(({ file }) => isDesignTokenFileName(file.name))
    const fonts = dropped.filter(({ file }) => isDocumentFontFileName(file.name))
    const store = getActiveEditorStoreOrNull()
    if (tokens.length > 0 && store)
      importTokenFiles(
        store,
        tokens.map(({ file }) => file)
      )
    if (fonts.length > 0 && store)
      void importDroppedFonts(
        store,
        fonts.map(({ file }) => file)
      )
    const documents = dropped.filter(
      (entry) => !store || (!tokens.includes(entry) && !fonts.includes(entry))
    )
    if (documents.length === 0) return
    void openDesignFileBatch(
      documents,
      ({ file }) => file.name,
      async ({ file, handle }) => openDesignFile(file, (await handle) ?? undefined)
    )
  })
}

import { useFileDialog } from '@vueuse/core'

import { resolveEditorProfile } from '@pairdraw/core'
import { filterCanvasFiles } from '@pairdraw/vue/canvas/drop'
import { menuMessages } from '@pairdraw/vue/i18n'

import { useEditorStore, type EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import { isTauri } from '@/app/tauri/env'

import { PLACE_IMAGE_ACCEPT, PLACE_IMAGE_EXTENSIONS, placeImageFile } from './files'

const activeStore = useEditorStore()
/** The document the browser picker was opened for, which its files go to. */
let pickerTarget: EditorStore | null = null

const fileDialog = useFileDialog({ accept: PLACE_IMAGE_ACCEPT, multiple: true, reset: true })

// Opening the picker again resets its input, which reports no files before anything is chosen;
// that keeps the target for the pick to come.
fileDialog.onChange((files) => {
  if (!files) return
  const target = pickerTarget ?? activeStore
  pickerTarget = null
  void placeFilesInView(target, Array.from(files))
})

fileDialog.onCancel(() => {
  pickerTarget = null
})

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Places images and SVG files around the middle of the view, in the container being edited or
 * the page, as one step that selects them. Files of other kinds are left out, and a choice with
 * none to place says which kinds can be.
 */
async function placeFilesInView(store: EditorStore, files: readonly File[]): Promise<void> {
  const placeable = filterCanvasFiles(files)
  const messages = notificationMessages.get()
  if (placeable.length === 0) {
    if (files.length > 0) toast.error(messages.placeImageUnsupported)
    return
  }
  const screen = store.viewportCanvasCenter()
  const center = store.screenToCanvas(screen.x, screen.y)
  try {
    await store.placeFiles(placeable, center.x, center.y)
  } catch (error) {
    console.error('[Place image] Could not place the files:', error)
    toast.error(messages.placeImageFailed({ error: errorText(error) }))
  }
}

/** Asks the desktop app's own dialog, since a menu event carries no click to open the browser's. */
async function chooseDesktopImages(): Promise<File[]> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const picked = await open({
    multiple: true,
    filters: [{ name: menuMessages.get().imageFiles, extensions: [...PLACE_IMAGE_EXTENSIONS] }]
  })
  if (!picked) return []
  const paths = typeof picked === 'string' ? [picked] : picked
  const { readFile } = await import('@tauri-apps/plugin-fs')
  return Promise.all(paths.map(async (path) => placeImageFile(path, await readFile(path))))
}

/** Whether the document takes new layers: it is editable and shows its editing view. */
function canPlaceImages(store: EditorStore): boolean {
  const profile = resolveEditorProfile(store.state)
  return profile.edits && profile.editChrome
}

/**
 * Opens a file picker and places the images and SVG files chosen in the middle of the view, as
 * Figma's Place image does. A document that cannot be edited is left alone.
 */
export function openPlaceImageDialog(store: EditorStore = activeStore): void {
  if (!canPlaceImages(store)) return
  if (isTauri()) {
    chooseDesktopImages()
      .then((files) => placeFilesInView(store, files))
      .catch((error: unknown) => {
        console.error('[Place image] Could not read the files:', error)
        toast.error(notificationMessages.get().placeImageFailed({ error: errorText(error) }))
      })
    return
  }
  pickerTarget = store
  fileDialog.open()
}

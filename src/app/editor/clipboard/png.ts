import type { EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'
import { writeTauriClipboardImage } from '@/app/tauri/clipboard'
import { IS_TAURI } from '@/constants'

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  const bytes = new Uint8Array(data.length)
  bytes.set(data)
  return bytes.buffer
}

/**
 * Copies the layers as a PNG image at 2×, as Figma's Copy as PNG does, from the canvas menu or
 * its shortcut. Browsers accept a clipboard write only during the user's click or key press, so
 * the write starts at once with a promise of the image, as `copyPendingText` does for text;
 * rendering first can outlast that window in Safari. Nothing happens without layers or when they
 * draw nothing; a browser without image clipboard support, or one that blocks the write, says so.
 * The desktop app writes through the system clipboard instead, which has no such window.
 */
export async function copyLayersAsPNG(store: EditorStore, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  if (IS_TAURI) {
    await copyLayersAsPNGNatively(store, ids)
    return
  }
  if (typeof ClipboardItem === 'undefined') {
    toast.error(notificationMessages.get().pngClipboardUnavailable)
    return
  }
  const progress = { rendered: false }
  const blob = store.renderExportImage([...ids], 2, 'PNG').then((data) => {
    if (!data) throw new Error('The layers draw nothing to copy as PNG')
    progress.rendered = true
    return new Blob([toArrayBuffer(data)], { type: 'image/png' })
  })
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  } catch (error: unknown) {
    if (!progress.rendered) return
    console.warn('Copy as PNG failed', error)
    toast.error(notificationMessages.get().clipboardAccessBlocked)
    return
  }
  toast.info(notificationMessages.get().copiedAs({ format: 'PNG' }))
}

async function copyLayersAsPNGNatively(store: EditorStore, ids: readonly string[]): Promise<void> {
  const data = await store.renderExportImage([...ids], 2, 'PNG')
  if (!data) return
  try {
    await writeTauriClipboardImage(data)
  } catch (error: unknown) {
    console.warn('Copy as PNG failed', error)
    toast.error(notificationMessages.get().clipboardAccessBlocked)
    return
  }
  toast.info(notificationMessages.get().copiedAs({ format: 'PNG' }))
}

/** Copy as PNG on the selection, for the shortcut. */
export function copySelectionAsPNG(store: EditorStore): void {
  void copyLayersAsPNG(store, [...store.state.selectedIds])
}

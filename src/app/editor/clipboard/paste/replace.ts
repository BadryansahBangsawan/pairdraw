import type { EditorStore } from '@/app/editor/active-store'
import { pasteClipboardHTML } from '@/app/editor/clipboard/paste/content'
import { readClipboardHTML } from '@/app/editor/clipboard/read'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

export async function pasteClipboardToReplace(store: EditorStore) {
  try {
    const html = await readClipboardHTML()
    if (!html) {
      toast.error(notificationMessages.get().clipboardMissingDesignData)
      return
    }
    await pasteClipboardHTML(store, html, undefined, { replaceSelection: true })
  } catch (error) {
    console.warn('Paste to replace failed', error)
    toast.error(notificationMessages.get().clipboardAccessBlocked)
  }
}

/**
 * pen.dev's Replace inside instance (⌥⇧R): the clipboard's layer takes the place of each selected
 * layer inside an instance, kept as that instance's override. A selection with no such layer
 * pastes to replace as usual.
 */
export async function pasteClipboardToReplaceInInstance(store: EditorStore) {
  if (store.replaceableInstanceLayers(store.state.selectedIds).length === 0) {
    await pasteClipboardToReplace(store)
    return
  }
  try {
    const html = await readClipboardHTML()
    if (!html) {
      toast.error(notificationMessages.get().clipboardMissingDesignData)
      return
    }
    await pasteClipboardHTML(store, html, undefined, { replaceInInstance: true })
  } catch (error) {
    console.warn('Replace inside instance failed', error)
    toast.error(notificationMessages.get().clipboardAccessBlocked)
  }
}

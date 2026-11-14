import { registerDocumentFonts } from '@pairdraw/core/text'

import type { EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/**
 * Registers dropped font files for the open document, so its text draws in them and the
 * FontPicker offers them. Files no font holds are reported as files that cannot be opened.
 */
export async function importDroppedFonts(store: EditorStore, files: File[]): Promise<void> {
  const messages = notificationMessages.get()
  for (const file of files) {
    let data: ArrayBuffer
    try {
      data = await file.arrayBuffer()
    } catch (error) {
      toast.error(
        messages.openFileFailed({
          name: file.name,
          error: error instanceof Error ? error.message : String(error)
        })
      )
      continue
    }
    const { skipped } = await registerDocumentFonts(store.graph, [{ data }])
    if (skipped > 0)
      toast.error(messages.openFileFailed({ name: file.name, error: 'not a font file' }))
  }
}

import { getActiveEditorStoreOrNull } from '@/app/editor/active-store'
import { focusNodesOnTheirPage } from '@/app/editor/selection/focus'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/**
 * Selects and zooms a layer on its own page, switching pages when needed. A failed focus, other
 * than one a later page switch superseded, names the error in a toast.
 */
export async function showNodeOnCanvas(id: string): Promise<void> {
  const store = getActiveEditorStoreOrNull()
  if (!store) return
  try {
    await focusNodesOnTheirPage(store, [id])
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    toast.error(
      notificationMessages.get().operationFailed({
        error: error instanceof Error ? error.message : String(error)
      })
    )
  }
}

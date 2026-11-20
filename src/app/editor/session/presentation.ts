import type { EditorPreparationHandle } from '@/app/editor/preparation/types'

import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/**
 * Waits for the pane in front to show the page a switch just committed. A canvas that cannot draw
 * it fails this wait, not the switch: the page is already in, so the document an open waits on
 * stays, and the failure is reported once. Returns whether the page was shown.
 */
export async function waitForCommittedPage(
  waitForPresentation: () => Promise<void>,
  preparation: EditorPreparationHandle,
  signal: AbortSignal
): Promise<boolean> {
  try {
    await waitForPresentation()
    return true
  } catch (error) {
    signal.throwIfAborted()
    const message = error instanceof Error ? error.message : String(error)
    preparation.fail({ code: 'render-failed', message, retryable: true })
    toast.error(notificationMessages.get().operationFailed({ error: message }))
    return false
  }
}

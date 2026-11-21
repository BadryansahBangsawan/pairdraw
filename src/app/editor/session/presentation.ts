import type { EditorPreparationHandle } from '@/app/editor/preparation/types'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

/**
 * Announces a committed page is ready to draw and, when the caller asks for it, waits for the
 * pane in front to show it. A document open passes `false` so it ends with its page applied,
 * not with a first frame nothing may draw.
 */
export async function presentCommittedPage(
  preparation: EditorPreparationHandle,
  detail: string | null,
  awaitPresentation: boolean,
  waitForPresentation: () => Promise<void>
): Promise<boolean> {
  if (!awaitPresentation) {
    // The open ends with the page applied. The phase stays until the pane draws the page or
    // fails, so a canvas failure before that first frame still reports through this preparation.
    preparation.update({ phase: 'preparing-render', detail })
    void waitForCommittedPage(waitForPresentation, preparation, preparation.signal)
      // An aborted load is already ended by its canceller; this only closes the phase it held.
      .catch(() => undefined)
      .finally(() => preparation.complete())
    return true
  }
  preparation.update({ phase: 'preparing-render', detail })
  return waitForCommittedPage(waitForPresentation, preparation, preparation.signal)
}

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
    // A background wait can outlive the load it belonged to; only a live preparation reports.
    if (preparation.fail({ code: 'render-failed', message, retryable: true }))
      toast.error(notificationMessages.get().operationFailed({ error: message }))
    return false
  }
}

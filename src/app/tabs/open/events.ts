import { createEventHook } from '@vueuse/core'

import type { DocumentSourceIdentity } from '@/app/document/io/types'
import type { EditorStore } from '@/app/editor/session'

/**
 * A `.fig` file that just opened in a tab of its own, from the file it was read from.
 * `modifiedAt` is the file's last change in epoch milliseconds, where the file reports a real one.
 */
export type OpenedFile = {
  store: EditorStore
  identity: DocumentSourceIdentity
  modifiedAt?: number
}

const opened = createEventHook<OpenedFile>()

/** Calls back each time a file opens in a tab, as the recovered-changes offer follows them. */
export const onFileOpened = opened.on

export function announceFileOpened(file: OpenedFile): void {
  void opened.trigger(file)
}

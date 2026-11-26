import { codeMessages } from '@pairdraw/vue/i18n'

import { toast } from '@/app/shell/ui'

/**
 * The notice a Copy as … action shows when the selection draws nothing: the clipboard got no
 * content, and staying silent reads as a broken button. The copy keys say it in the app's
 * language, beside the export ones a failed export shows.
 */
export function reportNothingToCopy(): void {
  const messages = codeMessages.get()
  toast.error(messages.copyFailed({ error: messages.copyNothing }))
}

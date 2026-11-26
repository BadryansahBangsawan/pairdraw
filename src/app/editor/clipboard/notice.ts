import { codeMessages } from '@pairdraw/vue/i18n'

import { toast } from '@/app/shell/ui'

/**
 * The notice a Copy as … action shows when the selection draws nothing: the clipboard got no
 * content, and staying silent reads as a broken button. It reuses the export notice so a copy and
 * an export that find nothing say the same thing.
 */
export function reportNothingToCopy(): void {
  const messages = codeMessages.get()
  toast.error(messages.exportFailed({ error: messages.exportNothing }))
}

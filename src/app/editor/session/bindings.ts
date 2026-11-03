import type { Editor } from '@open-pencil/core'

import { bindClipboardNotifications } from '@/app/editor/clipboard/notifications'
import { bindHyperlinkOpening } from '@/app/editor/links'
import { bindViewportMotion } from '@/app/editor/viewport/motion'

/** Wires the app services that react to editor events for the lifetime of an editor. */
export function bindEditorServices(editor: Editor): void {
  bindClipboardNotifications(editor)
  bindHyperlinkOpening(editor)
  bindViewportMotion(editor)
}

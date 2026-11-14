import type { Editor } from '@pairdraw/core'
import { setViewportMotion } from '@pairdraw/vue/canvas'

import { appRuntimeConfig } from '@/app/runtime/config'
import { animationsEnabled } from '@/app/shell/motion'

/**
 * Lets the editor's viewport changes glide only where the app plays animations: not with
 * Animations off, Ultralight mode, or reduced motion, and not in a test run unless it asks.
 */
export function bindViewportMotion(editor: Pick<Editor, 'state'>): void {
  setViewportMotion(editor, () => appRuntimeConfig.viewportMotion && animationsEnabled.value)
}

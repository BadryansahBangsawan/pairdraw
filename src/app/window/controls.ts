import { tryOnScopeDispose } from '@vueuse/core'
import { readonly, shallowRef, type Ref } from 'vue'

import { IS_TAURI } from '@/constants'

/**
 * The desktop app's windows on macOS hide their title bar and draw the close, minimize, and zoom
 * buttons over the top bar's start (`desktop/tauri.conf.json`).
 */
const CONTROLS_OVER_TOP_BAR = IS_TAURI && /Mac/u.test(navigator.userAgent)

/**
 * Whether the window's own buttons sit over the top bar's start, so the bar leaves them room.
 * A full-screen window hides them.
 */
export function useWindowControlsOverTopBar(): Readonly<Ref<boolean>> {
  const over = shallowRef(CONTROLS_OVER_TOP_BAR)
  if (!CONTROLS_OVER_TOP_BAR) return readonly(over)
  let stop: (() => void) | null = null
  let disposed = false
  const follow = async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const window = getCurrentWindow()
    const update = async () => {
      over.value = !(await window.isFullscreen())
    }
    const unlisten = await window.onResized(() => void update())
    if (disposed) unlisten()
    else stop = unlisten
    await update()
  }
  void follow()
  tryOnScopeDispose(() => {
    disposed = true
    stop?.()
  })
  return readonly(over)
}

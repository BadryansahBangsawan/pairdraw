import type { Window as NativeWindow } from '@tauri-apps/api/window'
import { tryOnScopeDispose } from '@vueuse/core'
import { readonly, shallowRef, type Ref } from 'vue'

import { IS_TAURI } from '@/constants'

/**
 * The desktop app's windows on macOS hide their title bar and draw the close, minimize, and zoom
 * buttons over the top bar's start (`desktop/tauri.conf.json`).
 */
const CONTROLS_OVER_TOP_BAR = IS_TAURI && /Mac/u.test(navigator.userAgent)

/** What following full screen needs of the native window. */
export type FullScreenWindow = Pick<NativeWindow, 'isFullscreen' | 'onResized'>

async function loadCurrentWindow(): Promise<FullScreenWindow> {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  return getCurrentWindow()
}

/**
 * Whether the window's own buttons sit over the top bar's start, so the bar leaves them room.
 * A full-screen window hides them.
 */
export function useWindowControlsOverTopBar(
  controlsOverTopBar = CONTROLS_OVER_TOP_BAR,
  loadWindow: () => Promise<FullScreenWindow> = loadCurrentWindow
): Readonly<Ref<boolean>> {
  const over = shallowRef(controlsOverTopBar)
  if (!controlsOverTopBar) return readonly(over)
  let stop: (() => void) | null = null
  let disposed = false
  const warn = (error: unknown) => {
    console.warn("[Window] Failed to follow the window's full-screen state:", error)
  }
  const follow = async () => {
    const window = await loadWindow()
    const update = async () => {
      over.value = !(await window.isFullscreen())
    }
    const unlisten = await window.onResized(() => void update().catch(warn))
    if (disposed) unlisten()
    else stop = unlisten
    await update()
  }
  follow().catch(warn)
  tryOnScopeDispose(() => {
    disposed = true
    stop?.()
  })
  return readonly(over)
}

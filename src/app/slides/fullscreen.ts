import { useFullscreen } from '@vueuse/core'
import { onMounted, onScopeDispose, watch } from 'vue'

import { IS_TAURI } from '@/constants'

/**
 * Takes the screen for a presentation while the calling component is mounted, and gives it back
 * as it unmounts; a screen that was already full stays full. In the browser leaving full screen
 * (Escape there never reaches the page) calls `onLeave`. Where full screen is refused, as in an
 * embedded frame, the presentation still fills the window.
 */
export function usePresentationFullscreen(onLeave: () => void) {
  if (IS_TAURI) {
    useWindowFullscreen()
    return
  }
  const { isFullscreen, isSupported, enter, exit } = useFullscreen()
  let entered = false
  onMounted(async () => {
    if (!isSupported.value || isFullscreen.value) return
    try {
      await enter()
      entered = isFullscreen.value
    } catch (error) {
      console.warn('[Presentation] Full screen was refused:', error)
    }
  })
  watch(isFullscreen, (full) => {
    if (full || !entered) return
    entered = false
    onLeave()
  })
  onScopeDispose(() => {
    if (!entered) return
    entered = false
    exit().catch(() => undefined)
  })
}

/** The desktop app's window, which takes the screen natively. */
function useWindowFullscreen() {
  let restore: (() => Promise<void>) | null = null
  let disposed = false
  // Read through a call: the component can unmount while the window answers.
  const isDisposed = () => disposed
  onMounted(async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const appWindow = getCurrentWindow()
      if (isDisposed() || (await appWindow.isFullscreen())) return
      await appWindow.setFullscreen(true)
      restore = () => appWindow.setFullscreen(false)
      if (isDisposed()) await restore()
    } catch (error) {
      console.warn('[Presentation] Full screen was refused:', error)
    }
  })
  onScopeDispose(() => {
    disposed = true
    restore?.().catch(() => undefined)
  })
}

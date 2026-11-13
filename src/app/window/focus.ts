import { IS_TAURI } from '@/constants'

/**
 * Calls `handler` whenever this window gains focus, and once now if it already has it. The
 * automation bridge uses it to report which window tool calls belong to. The browser build has
 * one window and no shell to ask, so nothing is reported there.
 */
export async function watchWindowFocus(handler: () => void): Promise<() => void> {
  if (!IS_TAURI) return () => {}
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  const window = getCurrentWindow()
  if (await window.isFocused()) handler()
  return window.onFocusChanged(({ payload }) => {
    if (payload) handler()
  })
}

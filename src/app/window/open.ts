import { isTauri } from '@/app/tauri/env'

/**
 * Opens a second editor window through the shell and returns its label. The browser build has
 * one window, so it does nothing there.
 */
export async function openEditorWindow(): Promise<string | null> {
  if (!isTauri()) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<string>('open_window')
}

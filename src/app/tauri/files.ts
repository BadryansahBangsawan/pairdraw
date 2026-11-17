import { invoke } from '@tauri-apps/api/core'

/**
 * Replaces a desktop file only after the new bytes are flushed.
 * The command writes a temp file beside the target and renames it over, so a crash or a full
 * disk leaves the previous file in place.
 */
export async function writeDesktopFile(path: string, data: Uint8Array): Promise<void> {
  await invoke('write_document_file', data, {
    headers: { path: encodeURIComponent(path) }
  })
}

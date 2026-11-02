import { readText, writeHtml, writeImage, writeText } from '@tauri-apps/plugin-clipboard-manager'

import { isTauri } from '@/app/tauri/env'

export async function writeTauriClipboardHTML(html: string, plainText: string) {
  if (!isTauri()) return false
  await writeHtml(html, plainText)
  return true
}

export async function writeTauriClipboardText(text: string) {
  if (!isTauri()) return false
  await writeText(text)
  return true
}

/**
 * Puts a PNG image on the system clipboard. Tauri decodes the bytes with its `image-png` feature;
 * the webview's own image clipboard is missing on Linux and unreliable in the macOS webview.
 */
export async function writeTauriClipboardImage(png: Uint8Array) {
  if (!isTauri()) return false
  await writeImage(png)
  return true
}

export async function readTauriClipboardText() {
  if (!isTauri()) return null
  return readText()
}

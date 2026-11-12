import * as v from 'valibot'

/**
 * The open page as text. `browser_page_text` returns a JSON string of `{url, title, text}`.
 * A string that is not JSON stays characters. This file does not import a capture or create layers.
 */
export function pageTextPayload(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson()), value)
  return parsed.success ? parsed.output : value
}

/** Asks the desktop browser window for the open page's URL, title, and visible text. */
export async function readBrowserPageText(): Promise<unknown> {
  const { invoke } = await import('@tauri-apps/api/core')
  return pageTextPayload(await invoke('browser_page_text'))
}

/**
 * Links in chat replies to files on this computer, written `[tokens.css](file:///Users/me/tokens.css)`
 * or `<file:///Users/me/tokens.css>`. The Markdown renderer refuses `file:` links, so on the
 * desktop the transcript renders them as `chat-file` components that show the file in its folder.
 * Revealing never runs the file, which a link a model wrote must not be able to do.
 */
import { compact } from 'es-toolkit/array'

import { attribute, escapeLabel, unescapeLabel } from './link'

/** A labelled link or an autolink to a `file:` URL; a URL with spaces needs the `<…>` form. */
const FILE_LINK =
  /\[((?:\\.|[^\]\\\n])*)\]\((?:<(file:\/\/[^>\n]+)>|(file:\/\/[^)\s]+))\)|<(file:\/\/[^>\s]+)>/g

/** The path a `file:` URL names, or null for any other URL or one naming no file. */
export function localFilePath(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'file:') return null
  let path: string
  try {
    path = decodeURIComponent(parsed.pathname)
  } catch {
    return null
  }
  if (!path || path === '/') return null
  // A share on another machine, as Windows writes `\\server\share`.
  if (parsed.host && parsed.host !== 'localhost') return `//${parsed.host}${path}`
  // `file:///C:/Users/me` names `C:/Users/me` on Windows.
  return /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path
}

/** The last part of a path, which a link without a label shows. */
export function fileName(path: string): string {
  const parts = compact(path.split(/[\\/]/))
  return parts.at(-1) ?? path
}

/**
 * The Markdown the desktop transcript renders: each link to a local file becomes an inline
 * `chat-file` component naming its path. A link whose URL names no file stays as written.
 */
export function fileLinkComponents(markdown: string): string {
  return markdown.replace(
    FILE_LINK,
    (source, label: string | undefined, bracketed?: string, bare?: string, auto?: string) => {
      const url = bracketed ?? bare ?? auto ?? ''
      const path = localFilePath(url)
      if (!path) return source
      const shown = label === undefined ? '' : unescapeLabel(label).trim()
      const text = shown || fileName(path)
      return `:chat-file[${escapeLabel(text)}]{path="${attribute(path)}" label="${attribute(text)}"}`
    }
  )
}

/** Shows the file in the system's file manager, selected; the desktop app only. */
export async function revealLocalFile(path: string): Promise<void> {
  const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
  await revealItemInDir(path)
}

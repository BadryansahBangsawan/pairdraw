/** The editor URL the extension loads when the user has not configured another one. */
export const DEFAULT_EDITOR_URL = 'http://localhost:1420'

export interface WebviewHTMLOptions {
  /** `webview.cspSource`, the only resource origin the script may come from. */
  cspSource: string
  /** The built `webview.js`, as a webview URI. */
  scriptUri: string
  editorUrl: string
  nonce: string
}

/** A URL the extension may frame: `https`, or plain `http` on loopback for a local dev server. */
export function parseEditorURL(value: string): URL | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol === 'https:') return url
  if (url.protocol === 'http:' && isLoopback(url.hostname)) return url
  return null
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function escapeHTML(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/**
 * The webview page: one iframe for the editor and the script that speaks the embed handshake.
 * The URL travels in a data attribute so the script can add the webview's own origin, which only
 * the page knows.
 */
export function embedWebviewHTML(options: WebviewHTMLOptions): string {
  const editor = parseEditorURL(options.editorUrl)
  if (!editor) throw new Error(`pairdraw.editorUrl is not an http(s) URL: ${options.editorUrl}`)
  const csp = [
    "default-src 'none'",
    `img-src ${options.cspSource} data:`,
    `style-src 'nonce-${options.nonce}'`,
    `script-src 'nonce-${options.nonce}'`,
    `frame-src ${editor.origin}`,
    `connect-src ${editor.origin}`
  ].join('; ')
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${escapeHTML(csp)}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pairdraw</title>
<style nonce="${options.nonce}">
html, body, iframe { margin: 0; padding: 0; border: 0; width: 100%; height: 100%; overflow: hidden; }
iframe { display: block; }
</style>
</head>
<body>
<iframe id="editor" data-editor-url="${escapeHTML(options.editorUrl)}" allow="clipboard-read; clipboard-write" title="Pairdraw editor"></iframe>
<script nonce="${options.nonce}" src="${escapeHTML(options.scriptUri)}"></script>
</body>
</html>
`
}

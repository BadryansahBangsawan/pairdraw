/** A `message` event the webview page can see, narrowed to what the host bridge needs. */
export interface ExtensionHostMessage {
  data: unknown
  source: unknown
}

/**
 * The payload a webview `message` event may hand to the host bridge, or `null` when the editor
 * iframe sent it. The iframe posts on the same window as the extension host and must not be able
 * to issue `load` or `save`.
 */
export function extensionHostData(event: ExtensionHostMessage, editorFrame: unknown): unknown {
  if (event.source === editorFrame) return null
  return event.data
}

import { shallowRef } from 'vue'

import { MAX_REMOTE_DOCUMENT_BYTES } from '@/app/document/io/browser'

import { createEmbedEditorHost } from './editor'
import { startEmbedHandshake, type EmbedHandshakeWindow } from './handshake'
import type { EmbedEditorHost } from './host'
import type { EmbedParams } from './params'
import { startEmbedSession, type EmbedSession } from './session'

export type { EmbedParams } from './params'
export { parseEmbedParams } from './params'

/** Where an embed stands: waiting for its host, connected to it, or refused by its own URL. */
export type EmbedStatus = 'waiting' | 'connected' | 'invalid-origin'

/** The window's embed status, which the embed overlay shows until the host connects. */
export const embedStatus = shallowRef<EmbedStatus>('waiting')

export interface StartEmbedOptions {
  target?: EmbedHandshakeWindow
  host?: EmbedEditorHost
}

/**
 * Starts embed mode: the shown document turns read-only at once, then the window waits for its
 * host's handshake and serves the protocol on the port it hands over. Returns the teardown.
 */
export function startEmbed(params: EmbedParams, options: StartEmbedOptions = {}): () => void {
  const host = options.host ?? createEmbedEditorHost()
  host.setEditable(false)
  if (!params.origin) {
    embedStatus.value = 'invalid-origin'
    console.warn('[Embed] The URL names no valid host origin, so no page can connect')
    return () => host.dispose()
  }
  embedStatus.value = 'waiting'
  const handshake = startEmbedHandshake(options.target ?? window, params.origin)
  let session: EmbedSession | null = null
  let stopped = false
  void handshake.connection.then(({ port, request }) => {
    if (stopped) {
      port.close()
      return undefined
    }
    session = startEmbedSession({
      port,
      host,
      allowEdit: params.allowEdit,
      requestEditable: request.editable,
      maxDocumentBytes: MAX_REMOTE_DOCUMENT_BYTES
    })
    embedStatus.value = 'connected'
    return undefined
  })
  return () => {
    stopped = true
    handshake.cancel()
    session?.close()
    host.dispose()
  }
}

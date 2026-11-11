import { fromUint8Array, toUint8Array } from 'js-base64'
import * as v from 'valibot'

import type { EmbedClient } from '../embed/client'
import { EMBED_DOCUMENT_FORMATS } from '../embed/protocol'
import type { WebviewMessage } from './messages'

/** Messages the extension sends the webview that hosts the editor iframe. */
export const hostMessageSchema = v.variant('type', [
  v.object({ type: v.literal('load'), name: v.string(), data: v.string() }),
  v.object({
    type: v.literal('save'),
    id: v.number(),
    format: v.optional(v.picklist(EMBED_DOCUMENT_FORMATS))
  }),
  v.object({ type: v.literal('setEditable'), editable: v.boolean() })
])

export type HostMessage = v.InferOutput<typeof hostMessageSchema>

export interface WebviewTransport {
  post(message: WebviewMessage): void
  /** Calls back with each raw message from the extension until the returned function is called. */
  onMessage(listener: (message: unknown) => void): () => void
}

export interface WebviewHostOptions {
  transport: WebviewTransport
  client: Pick<EmbedClient, 'load' | 'getDocument' | 'setEditable' | 'onEvent'>
}

/**
 * The document end of the embed: it turns the extension's load and save messages into embed
 * requests, and the editor's edits into one `documentchange`. Documents cross as Base64 because
 * a webview message is JSON.
 */
export function startWebviewHost(options: WebviewHostOptions): () => void {
  const { transport, client } = options

  const answer = async (message: HostMessage): Promise<void> => {
    try {
      if (message.type === 'load') {
        await client.load(message.name, toUint8Array(message.data))
        transport.post({ type: 'loaded', name: message.name })
        return
      }
      if (message.type === 'save') {
        const document = await client.getDocument(message.format)
        transport.post({
          type: 'saved',
          id: message.id,
          name: document.name,
          data: fromUint8Array(document.data)
        })
        return
      }
      await client.setEditable(message.editable)
      transport.post({ type: 'editable', editable: message.editable })
    } catch (error) {
      transport.post({
        type: 'error',
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const stopMessages = transport.onMessage((raw) => {
    const message = v.safeParse(hostMessageSchema, raw)
    if (!message.success) return
    void answer(message.output)
  })
  const stopEvents = client.onEvent((event) => {
    if (event.event === 'documentchange') transport.post({ type: 'documentchange' })
  })

  return () => {
    stopMessages()
    stopEvents()
  }
}

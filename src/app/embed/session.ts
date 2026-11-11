import * as v from 'valibot'

import type { EmbedEditorHost } from './host'
import {
  EMBED_METHODS,
  EMBED_PROTOCOL_VERSION,
  EmbedRequestError,
  type EmbedError,
  type EmbedEventMessage,
  type EmbedRequestId,
  type EmbedResponse
} from './protocol'
import { embedRequestEnvelopeSchema, embedRequestSchema, type EmbedRequest } from './schema'

/** The port a session talks over, narrowed so tests can use a `MessageChannel` or a double. */
interface EmbedPort {
  postMessage(message: unknown): void
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void
  removeEventListener(type: 'message', listener: (event: { data: unknown }) => void): void
  start(): void
  close(): void
}

export interface EmbedSessionOptions {
  port: EmbedPort
  host: EmbedEditorHost
  /** The embed URL allows editing; without it the session stays read-only whatever is asked. */
  allowEdit: boolean
  /** The host asked to edit in its `connect` message. */
  requestEditable: boolean
  /** Largest document `load` accepts, in bytes. */
  maxDocumentBytes: number
}

export interface EmbedSession {
  readonly editable: boolean
  close(): void
}

function isKnownMethod(method: string): boolean {
  return EMBED_METHODS.some((known) => known === method)
}

function errorOf(error: unknown): EmbedError {
  if (error instanceof EmbedRequestError) return { code: error.code, message: error.message }
  return { code: 'failed', message: error instanceof Error ? error.message : String(error) }
}

/** A request's bytes as a view, without copying an `ArrayBuffer` the host transferred. */
function bytesOf(data: Uint8Array | ArrayBuffer): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data)
}

/**
 * Runs the embed protocol over a connected port: validates each request, answers it exactly once,
 * and forwards the editor's events. Editing is off unless the URL allows it and the host asks.
 */
export function startEmbedSession(options: EmbedSessionOptions): EmbedSession {
  const { port, host, allowEdit, maxDocumentBytes } = options
  let editable = allowEdit && options.requestEditable
  let closed = false

  // Results are copied, never transferred: a document's bytes may share a buffer the editor keeps.
  function send(message: EmbedResponse | EmbedEventMessage): void {
    if (closed) return
    port.postMessage(message)
  }

  async function run(request: EmbedRequest): Promise<{ result: unknown }> {
    switch (request.method) {
      case 'load': {
        const data = bytesOf(request.params.data)
        if (data.byteLength === 0)
          throw new EmbedRequestError('invalid-request', 'The document is empty')
        if (data.byteLength > maxDocumentBytes) {
          throw new EmbedRequestError(
            'too-large',
            `Documents are limited to ${maxDocumentBytes} bytes`
          )
        }
        return { result: await host.load(request.params.name, data) }
      }
      case 'getDocument':
        return { result: await host.getDocument(request.params.format) }
      case 'getPages':
        return { result: host.getPages() }
      case 'setPage':
        await host.setPage(request.params.pageId)
        return { result: null }
      case 'getSelection':
        return { result: { nodeIds: host.getSelection() } }
      case 'select':
        return { result: { nodeIds: host.select(request.params.nodeIds) } }
      case 'zoomToFit':
        host.zoomToFit()
        return { result: null }
      case 'exportImage': {
        const { nodeIds, format, scale } = request.params
        return { result: await host.exportImage(nodeIds, format, scale) }
      }
      case 'setEditable': {
        if (request.params.editable && !allowEdit) {
          throw new EmbedRequestError('edit-not-allowed', 'This embed URL does not allow editing')
        }
        if (editable !== request.params.editable) {
          editable = request.params.editable
          host.setEditable(editable)
          send({ event: 'editablechange', data: { editable } })
        }
        return { result: { editable } }
      }
      default: {
        const unhandled: never = request
        throw new EmbedRequestError('unknown-method', `Unhandled request ${String(unhandled)}`)
      }
    }
  }

  async function answer(id: EmbedRequestId, request: EmbedRequest): Promise<void> {
    try {
      const { result } = await run(request)
      send({ id, ok: true, result })
    } catch (error) {
      send({ id, ok: false, error: errorOf(error) })
    }
  }

  function onMessage(event: { data: unknown }): void {
    const envelope = v.safeParse(embedRequestEnvelopeSchema, event.data)
    // Without an ID there is nobody to answer; such messages are dropped.
    if (!envelope.success) return
    const { id, method } = envelope.output
    if (!isKnownMethod(method)) {
      send({
        id,
        ok: false,
        error: { code: 'unknown-method', message: `Unknown method: ${method}` }
      })
      return
    }
    const request = v.safeParse(embedRequestSchema, event.data)
    if (!request.success) {
      const issue = request.issues[0]
      send({ id, ok: false, error: { code: 'invalid-request', message: issue.message } })
      return
    }
    void answer(id, request.output)
  }

  host.setEditable(editable)
  port.addEventListener('message', onMessage)
  port.start()
  send({ event: 'connected', data: { version: EMBED_PROTOCOL_VERSION, editable, allowEdit } })
  const unsubscribe = host.subscribe((message) => send(message))

  return {
    get editable() {
      return editable
    },
    close() {
      if (closed) return
      closed = true
      unsubscribe()
      port.removeEventListener('message', onMessage)
      port.close()
    }
  }
}

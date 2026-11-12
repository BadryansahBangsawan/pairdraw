import * as v from 'valibot'

import {
  EMBED_PROTOCOL,
  EMBED_PROTOCOL_VERSION,
  embedConnectedSchema,
  embedDocumentSchema,
  embedEventSchema,
  embedImageSchema,
  embedLoadResultSchema,
  embedReadySchema,
  embedResponseSchema,
  type EmbedDocumentFormat,
  type EmbedEvent,
  type EmbedImageFormat
} from './protocol'

/** The embedding page's window, narrowed so tests need no frames. */
export interface EmbedHostWindow {
  addEventListener(type: 'message', listener: (event: EmbedMessageEvent) => void): void
  removeEventListener(type: 'message', listener: (event: EmbedMessageEvent) => void): void
}

/** What the bridge reads of a `message` event. */
export interface EmbedMessageEvent {
  data: unknown
  origin: string
  source: unknown
  ports: readonly MessagePort[]
}

/** The editor iframe's window, as the handshake posts to it. */
export interface EmbedFrame {
  postMessage(message: unknown, targetOrigin: string, transfer?: Transferable[]): void
}

export interface ConnectEmbedOptions {
  window: EmbedHostWindow
  frame: EmbedFrame
  /** The editor's origin, exactly as its URL spells it. */
  editorOrigin: string
  /** How long to wait for the editor's `ready` before giving up. */
  timeoutMs?: number
}

export const EMBED_CONNECT_TIMEOUT_MS = 30_000
export const EMBED_REQUEST_TIMEOUT_MS = 60_000

export class EmbedClientError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'EmbedClientError'
    this.code = code
  }
}

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * The host side of one embed session: the handshake, then typed requests over the port the editor
 * hands back. The client answers nothing; the editor serves every request.
 */
export class EmbedClient {
  private readonly port: MessagePort
  private readonly pending = new Map<string, PendingRequest>()
  private readonly listeners = new Set<(event: EmbedEvent) => void>()
  private readonly messageListener: (event: MessageEvent) => void
  private nextId = 1
  private closed = false

  private constructor(port: MessagePort) {
    this.port = port
    this.messageListener = (event) => this.receive(event.data)
    port.addEventListener('message', this.messageListener)
    port.start()
  }

  /** Waits for the iframe's `ready`, answers with one port, and speaks the protocol over it. */
  static connect(options: ConnectEmbedOptions): Promise<EmbedClient> {
    const { window, frame, editorOrigin, timeoutMs = EMBED_CONNECT_TIMEOUT_MS } = options
    const { promise, resolve, reject } = Promise.withResolvers<EmbedClient>()
    let settled = false
    const finish = (client: EmbedClient | null, error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      if (client) resolve(client)
      else reject(error ?? new Error('The embed handshake ended without a client'))
    }
    const onMessage = (event: EmbedMessageEvent): void => {
      if (event.source !== frame || event.origin !== editorOrigin) return
      if (!v.is(embedReadySchema, event.data)) return
      const channel = new MessageChannel()
      frame.postMessage(
        {
          protocol: EMBED_PROTOCOL,
          type: 'connect',
          version: EMBED_PROTOCOL_VERSION,
          editable: true
        },
        editorOrigin,
        [channel.port2]
      )
      finish(new EmbedClient(channel.port1))
    }
    const timer = setTimeout(
      () => finish(null, new Error(`The editor at ${editorOrigin} did not answer`)),
      timeoutMs
    )
    window.addEventListener('message', onMessage)
    return promise
  }

  /** Answers one request; rejects with `EmbedClientError` when the editor refuses it. */
  request(method: string, params: unknown = {}): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('The embed session is closed'))
    const id = String(this.nextId++)
    const { promise, resolve, reject } = Promise.withResolvers<unknown>()
    const timer = setTimeout(() => {
      this.pending.delete(id)
      reject(new EmbedClientError('timeout', `The editor did not answer ${method}`))
    }, EMBED_REQUEST_TIMEOUT_MS)
    this.pending.set(id, { resolve, reject, timer })
    this.port.postMessage({ id, method, params })
    return promise
  }

  async load(name: string, data: Uint8Array): Promise<{ name: string }> {
    return v.parse(embedLoadResultSchema, await this.request('load', { name, data }))
  }

  async getDocument(
    format: EmbedDocumentFormat = 'fig'
  ): Promise<{ name: string; data: Uint8Array }> {
    const document = v.parse(embedDocumentSchema, await this.request('getDocument', { format }))
    return {
      name: document.name,
      data: document.data instanceof Uint8Array ? document.data : new Uint8Array(document.data)
    }
  }

  async setEditable(editable: boolean): Promise<void> {
    await this.request('setEditable', { editable })
  }

  /**
   * Rasterizes the given layers, or the editor's own selection when none are named, and returns
   * the bytes with the MIME type the editor reports for them.
   */
  async exportImage(
    options: { nodeIds?: string[]; format?: EmbedImageFormat; scale?: number } = {}
  ): Promise<{ data: Uint8Array; mimeType: string }> {
    const image = v.parse(embedImageSchema, await this.request('exportImage', options))
    return {
      data: image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data),
      mimeType: image.mimeType
    }
  }

  /** Listens for the editor's events until the returned function is called. */
  onEvent(listener: (event: EmbedEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** The editability the editor reported when it connected. */
  static connected(event: EmbedEvent): { editable: boolean; allowEdit: boolean } | null {
    if (event.event !== 'connected') return null
    const connected = v.safeParse(embedConnectedSchema, event.data)
    return connected.success
      ? { editable: connected.output.editable, allowEdit: connected.output.allowEdit }
      : null
  }

  close(): void {
    if (this.closed) return
    this.closed = true
    this.port.removeEventListener('message', this.messageListener)
    this.port.close()
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer)
      reject(new Error('The embed session closed before the request was answered'))
    }
    this.pending.clear()
    this.listeners.clear()
  }

  private receive(data: unknown): void {
    const event = v.safeParse(embedEventSchema, data)
    if (event.success) {
      for (const listener of this.listeners) listener(event.output)
      return
    }
    const response = v.safeParse(embedResponseSchema, data)
    if (!response.success) return
    const id = String(response.output.id)
    const pending = this.pending.get(id)
    if (!pending) return
    this.pending.delete(id)
    clearTimeout(pending.timer)
    if (response.output.ok) pending.resolve(response.output.result)
    else
      pending.reject(
        new EmbedClientError(response.output.error.code, response.output.error.message)
      )
  }
}

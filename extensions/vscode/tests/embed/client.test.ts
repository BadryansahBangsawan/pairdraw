import { describe, expect, test, vi } from 'bun:test'

import { EmbedClient, EmbedClientError } from '../../src/embed/client'
import type { EmbedFrame, EmbedHostWindow, EmbedMessageEvent } from '../../src/embed/client'
import { EMBED_PROTOCOL, EMBED_PROTOCOL_VERSION } from '../../src/embed/protocol'

const EDITOR_ORIGIN = 'https://editor.example'

function createHostWindow(): EmbedHostWindow & {
  send(event: EmbedMessageEvent): void
  listeners: number
} {
  const listeners = new Set<(event: EmbedMessageEvent) => void>()
  return {
    listeners: 0,
    addEventListener(_type, listener) {
      listeners.add(listener)
      this.listeners = listeners.size
    },
    removeEventListener(_type, listener) {
      listeners.delete(listener)
      this.listeners = listeners.size
    },
    send(event) {
      for (const listener of listeners) listener(event)
    }
  }
}

function createFrame(onConnect: (port: MessagePort) => void): EmbedFrame & {
  sent: { message: unknown; origin: string; ports: readonly Transferable[] }[]
} {
  // In the DOM the frame object the host posts to *is* the `source` of its messages, so the fake
  // keeps one object for both roles; otherwise the client's origin and source checks never pass.
  const frame = {
    sent: [] as { message: unknown; origin: string; ports: readonly Transferable[] }[],
    postMessage(message: unknown, origin: string, transfer: Transferable[] = []) {
      frame.sent.push({ message, origin, ports: transfer })
      const port = transfer[0]
      if (port instanceof MessagePort) onConnect(port)
    }
  }
  return frame
}

/** Answers requests on the editor's end of the port, the way the app session does. */
function serveEmbed(port: MessagePort, respond: (method: string, params: unknown) => unknown) {
  port.addEventListener('message', (event: MessageEvent) => {
    const request = event.data as { id: string; method: string; params: unknown }
    let message: unknown
    try {
      message = { id: request.id, ok: true, result: respond(request.method, request.params) }
    } catch (error) {
      message = {
        id: request.id,
        ok: false,
        error: { code: 'failed', message: error instanceof Error ? error.message : String(error) }
      }
    }
    port.postMessage(message)
  })
  port.start()
}

function readyEvent(source: unknown, origin = EDITOR_ORIGIN): EmbedMessageEvent {
  return {
    data: { protocol: EMBED_PROTOCOL, type: 'ready', version: EMBED_PROTOCOL_VERSION },
    origin,
    source,
    ports: []
  }
}

async function connectWith(respond: (method: string, params: unknown) => unknown) {
  let served: MessagePort | null = null
  const frame = createFrame((port) => {
    served = port
    serveEmbed(port, respond)
  })
  const window = createHostWindow()
  const pending = EmbedClient.connect({ window, frame, editorOrigin: EDITOR_ORIGIN, timeoutMs: 100 })
  window.send(readyEvent(frame))
  const client = await pending
  expect(served).not.toBeNull()
  return { client, frame, window }
}

describe('embed client', () => {
  test('answers the iframe ready with one port addressed to its origin', async () => {
    const frame = createFrame(() => undefined)
    const window = createHostWindow()
    const pending = EmbedClient.connect({ window, frame, editorOrigin: EDITOR_ORIGIN, timeoutMs: 100 })
    window.send(readyEvent(frame))
    const client = await pending
    expect(frame.sent).toHaveLength(1)
    expect(frame.sent[0].origin).toBe(EDITOR_ORIGIN)
    expect(frame.sent[0].ports).toHaveLength(1)
    expect(frame.sent[0].message).toEqual({
      protocol: EMBED_PROTOCOL,
      type: 'connect',
      version: EMBED_PROTOCOL_VERSION,
      editable: true
    })
    expect(window.listeners).toBe(0)
    client.close()
  })

  test('ignores a ready from another origin, another frame, or a wrong version', async () => {
    vi.useFakeTimers()
    try {
      const frame = createFrame(() => undefined)
      const window = createHostWindow()
      const pending = EmbedClient.connect({ window, frame, editorOrigin: EDITOR_ORIGIN, timeoutMs: 30 })
      window.send(readyEvent(frame, 'https://elsewhere.example'))
      window.send(readyEvent({}))
      window.send({
        ...readyEvent(frame),
        data: { protocol: EMBED_PROTOCOL, type: 'ready', version: 2 }
      })
      vi.advanceTimersByTime(30)
      await expect(pending).rejects.toThrow('did not answer')
      expect(frame.sent).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  test('loads bytes and reads the document back as typed results', async () => {
    const asked: string[] = []
    const { client } = await connectWith((method, params) => {
      if (method === 'load') return { name: (params as { name: string }).name }
      asked.push((params as { format: string }).format)
      return { name: 'drawing.fig', data: new Uint8Array([1, 2, 3]) }
    })
    await expect(client.load('drawing.fig', new Uint8Array([9]))).resolves.toEqual({
      name: 'drawing.fig'
    })
    await expect(client.getDocument()).resolves.toEqual({
      name: 'drawing.fig',
      data: new Uint8Array([1, 2, 3])
    })
    await expect(client.getDocument('pen')).resolves.toEqual({
      name: 'drawing.fig',
      data: new Uint8Array([1, 2, 3])
    })
    expect(asked).toEqual(['fig', 'pen'])
    client.close()
  })

  test('rejects a failed request with the editor error code', async () => {
    const { client } = await connectWith(() => {
      throw new Error('the document is too large')
    })
    const error = await client.load('huge.fig', new Uint8Array(1)).catch((reason) => reason)
    expect(error).toBeInstanceOf(EmbedClientError)
    expect(error).toMatchObject({ code: 'failed', message: 'the document is too large' })
    client.close()
  })

  test('forwards document events until close', async () => {
    let editorPort: MessagePort | null = null
    const frame = createFrame((port) => {
      editorPort = port
    })
    const window = createHostWindow()
    const pending = EmbedClient.connect({ window, frame, editorOrigin: EDITOR_ORIGIN, timeoutMs: 100 })
    window.send(readyEvent(frame))
    const client = await pending
    const seen: string[] = []
    let delivered: () => void = () => undefined
    const firstEvent = new Promise<void>((resolve) => {
      delivered = resolve
    })
    client.onEvent((event) => {
      seen.push(event.event)
      delivered()
    })
    editorPort!.postMessage({ event: 'documentchange', data: { name: 'a.fig' } })
    await firstEvent
    expect(seen).toEqual(['documentchange'])
    client.close()
    editorPort!.postMessage({ event: 'selectionchange', data: { nodeIds: ['1'] } })
    await Promise.resolve()
    expect(seen).toEqual(['documentchange'])
  })

  test('closing rejects a request the editor never answers', async () => {
    const { client } = await connectWith(() => undefined)
    const request = client.request('getPages')
    client.close()
    await expect(request).rejects.toThrow('closed')
  })
})
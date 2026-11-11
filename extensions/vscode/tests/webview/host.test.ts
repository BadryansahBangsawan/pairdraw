import { describe, expect, test } from 'bun:test'
import { fromUint8Array, toUint8Array } from 'js-base64'

import type { EmbedEvent } from '../../src/embed/protocol'
import { startWebviewHost, type HostMessage, type WebviewTransport } from '../../src/webview/host'
import type { WebviewMessage } from '../../src/webview/messages'

function createTransport() {
  let listener: (message: unknown) => void = () => undefined
  const posted: WebviewMessage[] = []
  const transport: WebviewTransport = {
    post: (message) => posted.push(message),
    onMessage: (next) => {
      listener = next
      return () => {
        listener = () => undefined
      }
    }
  }
  return {
    transport,
    posted,
    send: (message: unknown) => listener(message),
    stopListening: () => (listener = () => undefined)
  }
}

function createClient(document: { name: string; data: Uint8Array }) {
  const loaded: { name: string; data: Uint8Array }[] = []
  const editable: boolean[] = []
  const formats: string[] = []
  let emit: (event: EmbedEvent) => void = () => undefined
  return {
    loaded,
    editable,
    formats,
    client: {
      load: (name: string, data: Uint8Array) => {
        loaded.push({ name, data })
        return Promise.resolve({ name })
      },
      getDocument: (format?: string) => {
        formats.push(format ?? 'fig')
        return Promise.resolve(document)
      },
      setEditable: (value: boolean) => {
        editable.push(value)
        return Promise.resolve()
      },
      onEvent: (listener: (event: EmbedEvent) => void) => {
        emit = listener
        return () => {
          emit = () => undefined
        }
      }
    },
    emit: (event: EmbedEvent) => emit(event)
  }
}

const HOST_MESSAGES: HostMessage[] = [
  { type: 'load', name: 'drawing.fig', data: fromUint8Array(new Uint8Array([1, 2, 3])) },
  { type: 'save', id: 4 },
  { type: 'setEditable', editable: false }
]

describe('webview host bridge', () => {
  test('loads the bytes the extension sends and reports the name', async () => {
    const fake = createTransport()
    const fakeClient = createClient({ name: 'drawing.fig', data: new Uint8Array() })
    startWebviewHost({ transport: fake.transport, client: fakeClient.client })
    fake.send(HOST_MESSAGES[0])
    await Promise.resolve()
    await Promise.resolve()
    expect(fakeClient.loaded).toEqual([{ name: 'drawing.fig', data: new Uint8Array([1, 2, 3]) }])
    expect(fake.posted).toEqual([{ type: 'loaded', name: 'drawing.fig' }])
  })

  test('answers a save request with the current document as base64', async () => {
    const fake = createTransport()
    const fakeClient = createClient({ name: 'drawing.fig', data: new Uint8Array([4, 5]) })
    startWebviewHost({ transport: fake.transport, client: fakeClient.client })
    fake.send({ type: 'save', id: 4, format: 'pen' })
    await Promise.resolve()
    await Promise.resolve()
    expect(fakeClient.formats).toEqual(['pen'])
    expect(fake.posted).toEqual([
      { type: 'saved', id: 4, name: 'drawing.fig', data: fromUint8Array(new Uint8Array([4, 5])) }
    ])
  })

  test('applies editability and admits it', async () => {
    const fake = createTransport()
    const fakeClient = createClient({ name: 'a.fig', data: new Uint8Array() })
    startWebviewHost({ transport: fake.transport, client: fakeClient.client })
    fake.send(HOST_MESSAGES[2])
    await Promise.resolve()
    await Promise.resolve()
    expect(fakeClient.editable).toEqual([false])
    expect(fake.posted).toEqual([{ type: 'editable', editable: false }])
  })

  test('reports a failed request with its message instead of a result', async () => {
    const fake = createTransport()
    const failing = {
      ...createClient({ name: 'a.fig', data: new Uint8Array() }).client,
      load: () => Promise.reject(new Error('the document is too large'))
    }
    startWebviewHost({ transport: fake.transport, client: failing })
    fake.send(HOST_MESSAGES[0])
    await Promise.resolve()
    await Promise.resolve()
    expect(fake.posted).toEqual([{ type: 'error', message: 'the document is too large' }])
  })

  test('ignores a malformed message from the extension', async () => {
    const fake = createTransport()
    const fakeClient = createClient({ name: 'a.fig', data: new Uint8Array() })
    startWebviewHost({ transport: fake.transport, client: fakeClient.client })
    fake.send({ type: 'load', name: 'a.fig' })
    fake.send({ type: 'unknown' })
    fake.send('load')
    await Promise.resolve()
    expect(fakeClient.loaded).toEqual([])
    expect(fake.posted).toEqual([])
  })

  test('turns editor changes into a document change, and stops when asked', () => {
    const fake = createTransport()
    const fakeClient = createClient({ name: 'a.fig', data: new Uint8Array() })
    const stop = startWebviewHost({ transport: fake.transport, client: fakeClient.client })
    fakeClient.emit({ event: 'documentchange', data: { name: 'a.fig' } })
    fakeClient.emit({ event: 'selectionchange', data: { nodeIds: [] } })
    expect(fake.posted).toEqual([{ type: 'documentchange' }])
    stop()
    fakeClient.emit({ event: 'documentchange', data: { name: 'a.fig' } })
    expect(fake.posted).toHaveLength(1)
  })

  test('decodes base64 exactly, including bytes above 0x7f', () => {
    expect(toUint8Array(fromUint8Array(new Uint8Array([0, 127, 128, 255])))).toEqual(
      new Uint8Array([0, 127, 128, 255])
    )
  })
})
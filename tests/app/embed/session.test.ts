import { afterEach, describe, expect, test } from 'bun:test'

import type { EmbedEditorHost } from '@/app/embed/host'
import { EmbedRequestError, type EmbedEventMessage } from '@/app/embed/protocol'
import { startEmbedSession, type EmbedSession } from '@/app/embed/session'

const MAX_BYTES = 1024

/** An editor with one page and two layers, recording what the session asks of it. */
function fakeHost() {
  const calls: {
    editable: boolean[]
    loads: { name: string; bytes: number }[]
  } = { editable: [], loads: [] }
  let emit: (event: EmbedEventMessage) => void = () => undefined
  let selection: string[] = []
  const host: EmbedEditorHost = {
    load: async (name, data) => {
      calls.loads.push({ name, bytes: data.byteLength })
      return { name: name.replace(/\.\w+$/, '') }
    },
    getDocument: async () => ({ name: 'Doc', data: new Uint8Array([1, 2, 3]) }),
    getPages: () => ({ pages: [{ id: '0:1', name: 'Page 1' }], currentPageId: '0:1' }),
    setPage: async (pageId) => {
      if (pageId !== '0:1') throw new EmbedRequestError('not-found', 'No such page')
    },
    getSelection: () => selection,
    select: (nodeIds) => {
      selection = nodeIds.filter((id) => id === '1:1' || id === '1:2')
      emit({ event: 'selectionchange', data: { nodeIds: selection } })
      return selection
    },
    zoomToFit: () => undefined,
    exportImage: async (_nodeIds, format) => ({
      data: new Uint8Array([137, 80, 78, 71]),
      mimeType: format === 'PNG' ? 'image/png' : 'image/other'
    }),
    setEditable: (editable) => calls.editable.push(editable),
    subscribe: (listener) => {
      emit = listener
      return () => {
        emit = () => undefined
      }
    },
    dispose: () => undefined
  }
  return { host, calls }
}

type Reply = {
  id?: unknown
  ok?: boolean
  result?: unknown
  error?: { code: string }
  event?: string
  data?: unknown
}

/** The host page's end of the port: sends requests and reads every reply and event in order. */
function hostPage(port: MessagePort) {
  const received: Reply[] = []
  const waiters: (() => void)[] = []
  port.addEventListener('message', (event: MessageEvent<Reply>) => {
    received.push(event.data)
    for (const wake of waiters.splice(0)) wake()
  })
  port.start()
  async function next(match: (message: Reply) => boolean): Promise<Reply> {
    for (;;) {
      const found = received.find(match)
      if (found) return found
      await new Promise<void>((resolve) => {
        waiters.push(resolve)
      })
    }
  }
  let nextId = 0
  return {
    received,
    next,
    async request(method: string, params?: unknown): Promise<Reply> {
      const id = ++nextId
      port.postMessage({ id, method, params })
      return next((message) => message.id === id)
    },
    send: (message: unknown) => port.postMessage(message)
  }
}

let open: { session: EmbedSession; channel: MessageChannel } | null = null

function connect(options: { allowEdit?: boolean; requestEditable?: boolean } = {}) {
  const channel = new MessageChannel()
  const { host, calls } = fakeHost()
  const session = startEmbedSession({
    port: channel.port1,
    host,
    allowEdit: options.allowEdit ?? false,
    requestEditable: options.requestEditable ?? false,
    maxDocumentBytes: MAX_BYTES
  })
  open = { session, channel }
  return { session, calls, page: hostPage(channel.port2) }
}

afterEach(() => {
  open?.session.close()
  open?.channel.port2.close()
  open = null
})

describe('embed session', () => {
  test('announces itself first, read-only by default', async () => {
    const { page, calls } = connect()
    const connected = await page.next((message) => message.event === 'connected')
    expect(page.received[0]).toBe(connected)
    expect(connected.data).toEqual({ version: 1, editable: false, allowEdit: false })
    expect(calls.editable).toEqual([false])
  })

  test('edits from the start only when the URL allows it and the host asks', async () => {
    expect(connect({ requestEditable: true }).session.editable).toBe(false)
    open?.session.close()
    expect(connect({ allowEdit: true }).session.editable).toBe(false)
    open?.session.close()
    const { session, calls } = connect({ allowEdit: true, requestEditable: true })
    expect(session.editable).toBe(true)
    expect(calls.editable).toEqual([true])
  })

  test('refuses editing the URL does not allow', async () => {
    const { page, session } = connect()
    const reply = await page.request('setEditable', { editable: true })
    expect(reply).toMatchObject({ ok: false, error: { code: 'edit-not-allowed' } })
    expect(session.editable).toBe(false)
  })

  test('turns editing on and off when allowed, and tells the host', async () => {
    const { page, session, calls } = connect({ allowEdit: true })
    expect(await page.request('setEditable', { editable: true })).toMatchObject({
      ok: true,
      result: { editable: true }
    })
    expect(session.editable).toBe(true)
    await page.next((message) => message.event === 'editablechange')
    await page.request('setEditable', { editable: false })
    expect(calls.editable).toEqual([false, true, false])
  })

  test('loads a document as bytes or a buffer', async () => {
    const { page, calls } = connect()
    expect(
      await page.request('load', { name: 'Card.fig', data: new Uint8Array([1, 2, 3]) })
    ).toMatchObject({ ok: true, result: { name: 'Card' } })
    await page.request('load', { name: 'Card.pen', data: new ArrayBuffer(4) })
    expect(calls.loads).toEqual([
      { name: 'Card.fig', bytes: 3 },
      { name: 'Card.pen', bytes: 4 }
    ])
  })

  test('refuses empty and oversized documents without opening them', async () => {
    const { page, calls } = connect()
    const empty = await page.request('load', { name: 'a.fig', data: new Uint8Array() })
    const large = await page.request('load', { name: 'a.fig', data: new Uint8Array(MAX_BYTES + 1) })
    expect(empty.error?.code).toBe('invalid-request')
    expect(large.error?.code).toBe('too-large')
    expect(calls.loads).toEqual([])
  })

  test('answers reads and forwards the editor’s events', async () => {
    const { page } = connect()
    expect((await page.request('getPages')).result).toEqual({
      pages: [{ id: '0:1', name: 'Page 1' }],
      currentPageId: '0:1'
    })
    expect(await page.request('select', { nodeIds: ['1:1', '9:9'] })).toMatchObject({
      result: { nodeIds: ['1:1'] }
    })
    expect((await page.next((message) => message.event === 'selectionchange')).data).toEqual({
      nodeIds: ['1:1']
    })
    expect((await page.request('getSelection')).result).toEqual({ nodeIds: ['1:1'] })
    const document = await page.request('getDocument')
    expect(document.result).toEqual({ name: 'Doc', data: new Uint8Array([1, 2, 3]) })
    expect(await page.request('exportImage')).toMatchObject({
      ok: true,
      result: { mimeType: 'image/png' }
    })
    expect((await page.request('zoomToFit')).ok).toBe(true)
  })

  test('reports a host failure by its code', async () => {
    const { page } = connect()
    expect(await page.request('setPage', { pageId: '5:5' })).toMatchObject({
      ok: false,
      error: { code: 'not-found' }
    })
  })

  test('answers malformed requests and unknown methods, and drops messages without an ID', async () => {
    const { page } = connect()
    expect((await page.request('format-disk')).error?.code).toBe('unknown-method')
    expect((await page.request('select', { nodeIds: 'all' })).error?.code).toBe('invalid-request')
    expect((await page.request('exportImage', { scale: 100 })).error?.code).toBe('invalid-request')
    expect((await page.request('load', { name: 'a.fig', data: 'AAAA' })).error?.code).toBe(
      'invalid-request'
    )
    page.send({ method: 'getPages' })
    page.send('getPages')
    // A request after them still gets its own answer, and nothing answered the dropped ones.
    await page.request('getSelection')
    expect(page.received.filter((message) => message.id === undefined && !message.event)).toEqual(
      []
    )
  })

  test('stops answering and forwarding once closed', async () => {
    const { page, session } = connect()
    await page.next((message) => message.event === 'connected')
    session.close()
    page.send({ id: 99, method: 'getPages' })
    await Bun.sleep(10)
    expect(page.received.some((message) => message.id === 99)).toBe(false)
  })
})

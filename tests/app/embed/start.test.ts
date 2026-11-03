import { describe, expect, spyOn, test } from 'bun:test'

import { embedStatus, startEmbed } from '@/app/embed'
import type { EmbedHandshakeEvent, EmbedHandshakeWindow } from '@/app/embed/handshake'
import type { EmbedEditorHost } from '@/app/embed/host'
import { EMBED_PROTOCOL, EMBED_PROTOCOL_VERSION } from '@/app/embed/protocol'

import { asDouble } from '#tests/helpers/doubles'

const HOST = 'https://host.example'

function frame() {
  const listeners = new Set<(event: EmbedHandshakeEvent) => void>()
  const parent = { postMessage: () => undefined }
  const target: EmbedHandshakeWindow = {
    parent,
    postMessage: () => undefined,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener)
  }
  const connect = (port: MessagePort) => {
    for (const listener of listeners) {
      listener({
        data: { protocol: EMBED_PROTOCOL, type: 'connect', version: EMBED_PROTOCOL_VERSION },
        origin: HOST,
        source: parent,
        ports: [port]
      })
    }
  }
  return { target, connect }
}

function host() {
  const editable: boolean[] = []
  let disposed = false
  const double = asDouble<EmbedEditorHost>({
    setEditable: (value: boolean) => editable.push(value),
    subscribe: () => () => undefined,
    dispose: () => {
      disposed = true
    }
  })
  return { double, editable, disposed: () => disposed }
}

describe('embed mode', () => {
  test('holds the document read-only and refuses to wait without a valid origin', () => {
    const editor = host()
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    const stop = startEmbed(
      { origin: null, allowEdit: true, chrome: false },
      { target: frame().target, host: editor.double }
    )
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
    expect(embedStatus.value).toBe('invalid-origin')
    expect(editor.editable).toEqual([false])
    stop()
    expect(editor.disposed()).toBe(true)
  })

  test('waits for its host, then serves the session it connects', async () => {
    const editor = host()
    const window = frame()
    const stop = startEmbed(
      { origin: HOST, allowEdit: false, chrome: false },
      { target: window.target, host: editor.double }
    )
    expect(embedStatus.value).toBe('waiting')
    const channel = new MessageChannel()
    const connected = new Promise<unknown>((resolve) => {
      channel.port2.addEventListener('message', (event) => resolve(event.data))
      channel.port2.start()
    })
    window.connect(channel.port1)
    expect(await connected).toMatchObject({ event: 'connected' })
    expect(embedStatus.value).toBe('connected')
    stop()
    channel.port2.close()
    expect(editor.disposed()).toBe(true)
  })
})

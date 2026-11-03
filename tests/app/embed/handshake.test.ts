import { describe, expect, test } from 'bun:test'

import {
  startEmbedHandshake,
  type EmbedHandshakeEvent,
  type EmbedHandshakeWindow
} from '@/app/embed/handshake'
import { EMBED_PROTOCOL, EMBED_PROTOCOL_VERSION } from '@/app/embed/protocol'

const HOST = 'https://host.example'

function fakeWindow(framed = true) {
  const posted: { message: unknown; targetOrigin: string }[] = []
  const listeners = new Set<(event: EmbedHandshakeEvent) => void>()
  const parent = {
    postMessage(message: unknown, targetOrigin: string) {
      posted.push({ message, targetOrigin })
    }
  }
  const target: EmbedHandshakeWindow = {
    get parent() {
      return framed ? parent : target
    },
    postMessage: () => undefined,
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener)
  }
  const dispatch = (event: Partial<EmbedHandshakeEvent>) => {
    for (const listener of listeners) {
      listener({ data: undefined, origin: HOST, source: parent, ports: [], ...event })
    }
  }
  return { target, parent, posted, listeners, dispatch }
}

const connect = { protocol: EMBED_PROTOCOL, type: 'connect', version: EMBED_PROTOCOL_VERSION }

async function settled(promise: Promise<unknown>): Promise<boolean> {
  const marker = Symbol('pending')
  const result = await Promise.race([promise, Promise.resolve(marker)])
  return result !== marker
}

describe('embed handshake', () => {
  test('announces itself only to the expected origin', () => {
    const frame = fakeWindow()
    startEmbedHandshake(frame.target, HOST)
    expect(frame.posted).toEqual([
      {
        message: { protocol: EMBED_PROTOCOL, type: 'ready', version: EMBED_PROTOCOL_VERSION },
        targetOrigin: HOST
      }
    ])
  })

  test('accepts the parent’s connect from the expected origin with one port', async () => {
    const frame = fakeWindow()
    const handshake = startEmbedHandshake(frame.target, HOST)
    const { port1 } = new MessageChannel()
    frame.dispatch({ data: { ...connect, editable: true }, ports: [port1] })
    const connection = await handshake.connection
    expect(connection.port).toBe(port1)
    expect(connection.request.editable).toBe(true)
    // One connection per load: the listener is gone, so nobody can take the session over.
    expect(frame.listeners.size).toBe(0)
    port1.close()
  })

  test('ignores a connect from another origin, another frame, or without exactly one port', async () => {
    const frame = fakeWindow()
    const handshake = startEmbedHandshake(frame.target, HOST)
    const channel = new MessageChannel()
    const other = new MessageChannel()
    frame.dispatch({ data: connect, ports: [channel.port1], origin: 'https://evil.example' })
    frame.dispatch({ data: connect, ports: [channel.port1], origin: 'https://host.example.evil' })
    frame.dispatch({ data: connect, ports: [channel.port1], source: {} })
    frame.dispatch({ data: connect, ports: [] })
    frame.dispatch({ data: connect, ports: [channel.port1, other.port1] })
    frame.dispatch({ data: { ...connect, version: 2 }, ports: [channel.port1] })
    frame.dispatch({ data: { ...connect, protocol: 'other' }, ports: [channel.port1] })
    frame.dispatch({ data: 'connect', ports: [channel.port1] })
    expect(await settled(handshake.connection)).toBe(false)
    expect(frame.listeners.size).toBe(1)
    handshake.cancel()
    expect(frame.listeners.size).toBe(0)
    for (const port of [channel.port1, channel.port2, other.port1, other.port2]) port.close()
  })

  test('a window that is not framed announces nothing and accepts nothing', async () => {
    const frame = fakeWindow(false)
    const handshake = startEmbedHandshake(frame.target, HOST)
    expect(frame.posted).toEqual([])
    expect(frame.listeners.size).toBe(0)
    expect(await settled(handshake.connection)).toBe(false)
  })
})

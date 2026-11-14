import { describe, expect, mock, test } from 'bun:test'

import { ACP_AGENTS } from '@pairdraw/core/constants'

import {
  CompanionNotConnectedError,
  createCompanionAgentHost,
  type CompanionEndpoint
} from '@/app/ai/agents/host/companion'

import { expectDefined } from '#tests/helpers/assert'
import { asDouble } from '#tests/helpers/doubles'

const claude = expectDefined(
  ACP_AGENTS.find((agent) => agent.id === 'claude-code'),
  'Claude Code'
)
const TOKEN = 'session-token'
const paired: CompanionEndpoint = { url: () => 'http://127.0.0.1:7601', token: () => TOKEN }

/** A WebSocket the test plays the companion's side of. */
class FakeSocket extends EventTarget {
  readyState: number = WebSocket.CONNECTING
  binaryType = 'blob'
  readonly sent: unknown[] = []
  constructor(readonly url: string) {
    super()
    queueMicrotask(() => {
      this.readyState = WebSocket.OPEN
      this.dispatchEvent(new Event('open'))
    })
  }
  send(data: unknown) {
    this.sent.push(data)
  }
  close(code = 1000) {
    if (this.readyState === WebSocket.CLOSED) return
    this.readyState = WebSocket.CLOSED
    this.dispatchEvent(new CloseEvent('close', { code }))
  }
  receive(data: string | ArrayBuffer) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

function socketHost(endpoint = paired) {
  const sockets: FakeSocket[] = []
  const host = createCompanionAgentHost(endpoint, {
    fetch: async () => new Response('{}'),
    createSocket: (url) => {
      const socket = new FakeSocket(url)
      sockets.push(socket)
      return asDouble<WebSocket>(socket)
    }
  })
  /** The socket the host opened, once it sent its token. */
  async function opened(): Promise<FakeSocket> {
    for (;;) {
      const socket = sockets.at(-1)
      if (socket?.sent.length) return socket
      await Bun.sleep(1)
    }
  }
  return { host, opened }
}

describe('companionAgentHost', () => {
  test('asks the companion with the tab’s token', async () => {
    const request = mock(async (_url: string, _init?: RequestInit) =>
      Response.json({
        executables: { 'claude-agent-acp': '/bin/claude-agent-acp' },
        versions: {},
        npmGlobalWritable: true,
        searchPath: '/bin'
      })
    )
    const host = createCompanionAgentHost(paired, { fetch: request })
    const lookup = await host.detect()
    expect(lookup.executables['claude-agent-acp']).toBe('/bin/claude-agent-acp')
    const [url, init] = expectDefined(request.mock.calls[0], 'request')
    expect(String(url)).toBe('http://127.0.0.1:7601/agents')
    expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${TOKEN}`)
  })

  test('refuses to reach a companion the tab has not paired with', async () => {
    const host = createCompanionAgentHost({ url: paired.url, token: () => null })
    await expect(host.detect()).rejects.toBeInstanceOf(CompanionNotConnectedError)
    await expect(host.spawn(claude)).rejects.toBeInstanceOf(CompanionNotConnectedError)
  })

  test('installs only adapters, by the agent’s id', async () => {
    const request = mock(async (_url: string, _init?: RequestInit) => Response.json({ ok: true }))
    const host = createCompanionAgentHost(paired, { fetch: request })
    await host.install({ kind: 'adapter', agent: claude }, { searchPath: '', manager: 'npm' })
    const [url, init] = expectDefined(request.mock.calls[0], 'request')
    expect(String(url)).toBe('http://127.0.0.1:7601/agents/claude-code/install')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
    await expect(
      host.install({ kind: 'companion', companion: 'mcp' }, { searchPath: '', manager: 'npm' })
    ).rejects.toThrow()
  })

  test('pipes the agent’s stdio through its socket once the companion started it', async () => {
    const { host, opened } = socketHost()
    const onExit = mock(() => undefined)
    const spawning = host.spawn(claude, { onExit })
    const socket = await opened()
    expect(socket.url).toBe('ws://127.0.0.1:7601/agents/claude-code/acp')
    expect(JSON.parse(String(socket.sent[0]))).toEqual({ type: 'auth', token: TOKEN })
    socket.receive(JSON.stringify({ type: 'ready' }))
    const streams = await spawning

    socket.receive(new TextEncoder().encode('{"jsonrpc":"2.0"}\n').buffer)
    const reader = streams.output.getReader()
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('{"jsonrpc":"2.0"}\n')

    const writer = streams.input.getWriter()
    await writer.write(new TextEncoder().encode('hello'))
    expect(new TextDecoder().decode(socket.sent[1] as Uint8Array)).toBe('hello')

    await streams.close()
    expect(socket.readyState).toBe(WebSocket.CLOSED)
    expect((await reader.read()).done).toBe(true)
    expect(onExit).not.toHaveBeenCalled()
  })

  test('reports an agent that exits on its own', async () => {
    const { host, opened } = socketHost()
    const onExit = mock(() => undefined)
    const spawning = host.spawn(claude, { onExit })
    const socket = await opened()
    socket.receive(JSON.stringify({ type: 'ready' }))
    const streams = await spawning
    const reader = streams.output.getReader()
    socket.receive(JSON.stringify({ type: 'exit', code: 1, signal: null }))
    socket.close(1000)
    await expect(reader.read()).rejects.toThrow('Agent process exited unexpectedly.')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  test('names a missing program so the chat can say how to install it', async () => {
    const { host, opened } = socketHost()
    const spawning = host.spawn(claude)
    const socket = await opened()
    socket.receive(JSON.stringify({ type: 'error', reason: 'not-found', command: claude.command }))
    socket.close(4404)
    await expect(spawning).rejects.toThrow(`Program not found: ${claude.command}`)
  })

  test('closes the socket when the companion reports a start error', async () => {
    const { host, opened } = socketHost()
    const spawning = host.spawn(claude)
    const socket = await opened()
    socket.receive(JSON.stringify({ type: 'error', reason: 'not-found', command: claude.command }))
    await expect(spawning).rejects.toThrow(`Program not found: ${claude.command}`)
    expect(socket.readyState).toBe(WebSocket.CLOSED)
  })

  test('runs a terminal sign-in through its socket', async () => {
    const { host, opened } = socketHost()
    const onURL = mock((_url: string) => undefined)
    const starting = host.signIn(claude, { methodId: 'claude-ai-login', onURL })
    const socket = await opened()
    expect(socket.url).toBe('ws://127.0.0.1:7601/agents/claude-code/sign-in')
    socket.receive(JSON.stringify({ type: 'ready' }))
    const login = await starting
    socket.receive(JSON.stringify({ type: 'url', url: 'https://claude.ai/oauth?code=1' }))
    expect(onURL).toHaveBeenCalledWith('https://claude.ai/oauth?code=1')
    await login.submitCode?.('  pasted-code  ')
    expect(JSON.parse(String(socket.sent.at(-1)))).toEqual({ type: 'code', code: 'pasted-code' })
    socket.receive(JSON.stringify({ type: 'done', ok: true }))
    expect(await login.done).toBeNull()
  })

  test('ignores a sign-in page that is not https', async () => {
    const { host, opened } = socketHost()
    const onURL = mock((_url: string) => undefined)
    const starting = host.signIn(claude, { methodId: 'claude-ai-login', onURL })
    const socket = await opened()
    socket.receive(JSON.stringify({ type: 'ready' }))
    const login = await starting
    socket.receive(JSON.stringify({ type: 'url', url: 'http://claude.ai/oauth?code=1' }))
    expect(onURL).not.toHaveBeenCalled()
    await login.cancel()
    await expect(login.done).rejects.toThrow()
  })
})

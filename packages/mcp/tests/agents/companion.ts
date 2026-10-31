import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'
import { WebSocket } from 'ws'

import type { CompanionAgent } from '#mcp/agents/registry'
import { rawBytes } from '#mcp/agents/socket'
import { startServer, type ServerHandle } from '#mcp/server'

export const APP_ORIGIN = 'https://app.example'
export const MASTER_TOKEN = 'master-token'

const FAKE_AGENT = join(import.meta.dir, 'fixtures', 'fake-agent.ts')

/** A stand-in agent whose ACP program and sign-in run the fake agent fixture. */
export const FAKE_AGENT_ENTRY: CompanionAgent = {
  id: 'fake',
  command: 'fake-acp',
  args: ['echo'],
  adapterPackage: '@example/fake-acp',
  terminalSignIn: ['sign-in']
}

export interface TestCompanion {
  handle: ServerHandle
  base: string
  ws: string
  installs: string[]
  /** Pairs like a tab opening the printed link, and returns the session token. */
  pair(): Promise<string>
  close(): Promise<void>
}

export async function startCompanion(): Promise<TestCompanion> {
  const dir = mkdtempSync(join(tmpdir(), 'op-companion-'))
  const bin = join(dir, 'bin')
  const workspace = join(dir, 'workspace')
  mkdirSync(bin)
  const wrapper = join(bin, 'fake-acp')
  writeFileSync(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${FAKE_AGENT}" "$@"\n`)
  chmodSync(wrapper, 0o755)
  const installs: string[] = []
  const handle = await startServer({
    httpPort: 0,
    withTcp: true,
    socketPath: join(dir, 'mcp.sock'),
    authToken: MASTER_TOKEN,
    corsOrigin: [APP_ORIGIN],
    mcpRoot: null,
    agents: {
      registry: [FAKE_AGENT_ENTRY, { id: 'plain', command: 'fake-acp', args: ['echo'] }],
      searchPath: bin,
      workspace,
      installer: async (packageName) => {
        installs.push(packageName)
      }
    }
  })
  const base = `http://127.0.0.1:${handle.httpPort}`
  const issue = handle.issuePairingCode
  if (!issue) throw new Error('The agent bridge did not start')
  return {
    handle,
    base,
    ws: `ws://127.0.0.1:${handle.httpPort}`,
    installs,
    async pair() {
      const response = await fetch(`${base}/pair`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: APP_ORIGIN },
        body: JSON.stringify({ code: issue() })
      })
      const body = v.parse(
        v.pipe(v.string(), v.parseJson(), v.object({ token: v.string() })),
        await response.text()
      )
      return body.token
    },
    async close() {
      await handle.close()
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

/** Opens a socket and reports whether the server upgraded it, or the HTTP status it refused with. */
export function openSocket(
  url: string,
  origin?: string
): Promise<{ ws: WebSocket } | { status: number }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, origin ? { headers: { origin } } : {})
    ws.once('open', () => resolve({ ws }))
    ws.once('unexpected-response', (_request, response) =>
      resolve({ status: response.statusCode ?? 0 })
    )
    ws.once('error', reject)
  })
}

/** Collects what a socket receives: control messages as JSON and binary frames as text lines. */
export function recordSocket(ws: WebSocket) {
  const messages: Record<string, unknown>[] = []
  let output = ''
  const closed = new Promise<number>((resolve) => {
    ws.once('close', (code) => resolve(code))
  })
  ws.on('message', (data, isBinary) => {
    const text = rawBytes(data).toString('utf8')
    if (isBinary) output += text
    else messages.push(v.parse(v.pipe(v.string(), v.parseJson(), v.looseObject({})), text))
  })
  return {
    messages,
    get output() {
      return output
    },
    closed,
    async until(predicate: () => boolean, timeoutMs = 5_000) {
      const start = Date.now()
      while (!predicate()) {
        if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting on the socket')
        await Bun.sleep(10)
      }
    }
  }
}

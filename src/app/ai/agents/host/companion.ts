import { promiseTimeout } from '@vueuse/core'
import * as v from 'valibot'

import type { ACPAgentDef } from '@open-pencil/core/constants'

import { checkAgentAuth } from '@/app/ai/agents/acp/auth/session'
import { agentLookupSchema } from '@/app/ai/agents/setup/schema'
import { companion, type CompanionFetch } from '@/app/automation/companion/connection'
import {
  companionInfoSchema,
  companionSocketMessageSchema
} from '@/app/automation/companion/schema'
import { createDeferred } from '@/app/runtime/deferred'
import { APP_NAME } from '@/constants'

import { chatToolsProbe, signInInsideAgent } from './shared'
import type { AgentHost, AgentSignIn, AgentSpawnOptions, AgentStreams } from './types'

/** Where the companion listens and the token the tab paired with, read at each call. */
export interface CompanionEndpoint {
  url(): string
  token(): string | null
}

interface CompanionHostOptions {
  fetch?: CompanionFetch
  createSocket?: (url: string) => WebSocket
}

/** How long the companion may take to start a program and report it ready. */
const START_TIMEOUT_MS = 30_000
const CLOSE_TIMEOUT_MS = 2_000

type SocketMessage = v.InferOutput<typeof companionSocketMessageSchema>

export class CompanionNotConnectedError extends Error {
  constructor() {
    super(`${APP_NAME} is not connected to your computer. Run the companion and open its link.`)
    this.name = 'CompanionNotConnectedError'
  }
}

/** Why a socket closed before its program started, from the companion's close code. */
function closeError(event: CloseEvent, agent: ACPAgentDef): Error {
  if (event.code === 4401) return new CompanionNotConnectedError()
  if (event.code === 4404) return new Error(`Program not found: ${agent.command}`)
  if (event.code === 4409) return new Error('A sign-in is already running.')
  if (event.code === 4429) return new Error('Too many agents are running on your computer.')
  return new Error('The agent could not start.')
}

function parseMessage(data: unknown): SocketMessage | null {
  if (typeof data !== 'string') return null
  const parsed = v.safeParse(companionSocketMessageSchema, data)
  return parsed.success ? parsed.output : null
}

/**
 * Runs coding agents through the companion (`openpencil-connect`) on the person's computer, for
 * the web app. Detection and installs are HTTP calls; an agent's stdio and a terminal sign-in
 * each travel over a WebSocket that stops the program when it closes. The companion starts only
 * agents it knows, with their fixed command lines, so the tab names an agent and nothing else.
 */
export function createCompanionAgentHost(
  endpoint: CompanionEndpoint,
  {
    fetch: request = (input, init) => fetch(input, init),
    createSocket = (url) => new WebSocket(url)
  }: CompanionHostOptions = {}
): AgentHost {
  function session(): { url: string; token: string } {
    const token = endpoint.token()
    if (!token) throw new CompanionNotConnectedError()
    return { url: endpoint.url(), token }
  }

  async function call(path: string, init: RequestInit = {}): Promise<string> {
    const { url, token } = session()
    const response = await request(`${url}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.status === 401) throw new CompanionNotConnectedError()
    if (!response.ok) throw new Error(`The companion answered ${response.status}.`)
    return response.text()
  }

  async function workspace(): Promise<string> {
    const info = v.parse(
      v.pipe(v.string(), v.parseJson(), companionInfoSchema),
      await call('/companion')
    )
    return info.workspace
  }

  /**
   * Opens an agent's socket, authenticates with the tab's token, and resolves once the companion
   * started the program. `onMessage` then hears everything after `ready`.
   */
  function openSocket(
    agent: ACPAgentDef,
    kind: 'acp' | 'sign-in',
    onMessage: (event: MessageEvent) => void
  ): Promise<WebSocket> {
    const { url, token } = session()
    const socket = createSocket(`${url.replace(/^http/, 'ws')}/agents/${agent.id}/${kind}`)
    socket.binaryType = 'arraybuffer'
    const started = createDeferred<WebSocket>()
    let ready = false
    const timer = setTimeout(() => {
      started.reject(new Error('The agent did not start.'))
      socket.close()
    }, START_TIMEOUT_MS)
    socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'auth', token })))
    socket.addEventListener('message', (event) => {
      if (ready) {
        onMessage(event)
        return
      }
      const message = parseMessage(event.data)
      if (message?.type === 'ready') {
        ready = true
        clearTimeout(timer)
        started.resolve(socket)
      } else if (message?.type === 'error') {
        started.reject(
          new Error(
            message.reason === 'not-found'
              ? `Program not found: ${agent.command}`
              : 'The agent could not start.'
          )
        )
        clearTimeout(timer)
        socket.close()
      }
    })
    socket.addEventListener('close', (event) => {
      clearTimeout(timer)
      if (!ready) started.reject(closeError(event, agent))
    })
    return started.promise
  }

  async function spawn(
    agent: ACPAgentDef,
    { logId = agent.id, onExit }: AgentSpawnOptions = {}
  ): Promise<AgentStreams> {
    let closing = false
    let output: ReadableStreamDefaultController<Uint8Array> | null = null
    const pending: Uint8Array[] = []
    const socket = await openSocket(agent, 'acp', (event) => {
      if (event.data instanceof ArrayBuffer) {
        const chunk = new Uint8Array(event.data)
        if (output) output.enqueue(chunk)
        else pending.push(chunk)
        return
      }
      const message = parseMessage(event.data)
      if (message?.type === 'stderr') console.error(`[ACP ${logId}]`, message.text)
    })
    const closed = new Promise<void>((resolve) => {
      socket.addEventListener('close', () => {
        if (closing) output?.close()
        else {
          output?.error(new Error('Agent process exited unexpectedly.'))
          onExit?.()
        }
        resolve()
      })
    })
    return {
      output: new ReadableStream<Uint8Array>({
        start(controller) {
          output = controller
          for (const chunk of pending.splice(0)) controller.enqueue(chunk)
        }
      }),
      input: new WritableStream<Uint8Array>({
        write(chunk) {
          if (socket.readyState !== WebSocket.OPEN) throw new Error('The agent stopped.')
          // A copy, since the chunk may view a shared buffer, which a socket cannot send.
          socket.send(new Uint8Array(chunk))
        }
      }),
      async close() {
        closing = true
        if (socket.readyState === WebSocket.CLOSED) return
        socket.close(1000)
        await Promise.race([closed, promiseTimeout(CLOSE_TIMEOUT_MS)])
      }
    }
  }

  async function terminalSignIn(
    agent: ACPAgentDef,
    onURL: (url: string) => void
  ): Promise<AgentSignIn> {
    const finished = createDeferred<null>()
    let urlSeen = false
    const socket = await openSocket(agent, 'sign-in', (event) => {
      const message = parseMessage(event.data)
      if (message?.type === 'url' && !urlSeen) {
        urlSeen = true
        onURL(message.url)
      }
      if (message?.type === 'done') {
        if (message.ok) finished.resolve(null)
        else finished.reject(new Error('Sign-in did not finish.'))
      }
    })
    socket.addEventListener('close', () => finished.reject(new Error('Sign-in did not finish.')))
    const done = finished.promise
    // A caller that only cancels must not see an unhandled rejection.
    done.catch(() => undefined)
    return {
      done,
      async submitCode(code) {
        if (socket.readyState !== WebSocket.OPEN) throw new Error('Sign-in already ended.')
        socket.send(JSON.stringify({ type: 'code', code: code.trim() }))
      },
      async cancel() {
        finished.reject(new Error('Sign-in was cancelled.'))
        socket.close(1000)
      }
    }
  }

  return {
    async detect() {
      return v.parse(v.pipe(v.string(), v.parseJson(), agentLookupSchema), await call('/agents'))
    },
    async install(target) {
      // The companion is OpenPencil's MCP server, and the browser offers no Pi.
      if (target.kind !== 'adapter') {
        throw new Error('The companion installs only agent adapters.')
      }
      await call(`/agents/${encodeURIComponent(target.agent.id)}/install`, { method: 'POST' })
    },
    async signIn(agent, { methodId, onURL }) {
      if (agent.signIn?.via === 'terminal') return terminalSignIn(agent, onURL)
      return signInInsideAgent(agent, methodId, spawn)
    },
    check: (agent) => checkAgentAuth(agent, { spawn, tools: chatToolsProbe(workspace) }),
    spawn,
    workspace
  }
}

/** Agents the paired companion runs on the person's computer, for the web app. */
export const companionAgentHost = createCompanionAgentHost({
  url: companion.url,
  token: companion.token
})

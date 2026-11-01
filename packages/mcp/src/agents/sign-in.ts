import type { ChildProcess } from 'node:child_process'

import * as v from 'valibot'
import type { RawData, WebSocket } from 'ws'

import type { AgentProcessContext } from './acp'
import { ProgramNotFoundError, spawnFixed, terminate } from './process'
import type { CompanionAgent } from './registry'
import { signInMessageSchema } from './schema'
import { CLOSE_CODES, rawBytes, sendJSON } from './socket'

/** Long enough to sign in from a fresh browser, short enough not to leave a login waiting. */
const SIGN_IN_TIMEOUT_MS = 5 * 60_000
const MAX_URL_LENGTH = 2_048
const MAX_LINE_BUFFER = 16_384

// eslint-disable-next-line no-control-regex -- Escape sequences are what it removes.
const TERMINAL_CODES = /\u001B\]8;[^\u0007\u001B]*(?:\u0007|\u001B\\)|\u001B\[[0-9;?]*[A-Za-z]/g

/** The first https address in the login's output, without terminal codes, or null. */
export function findSignInURL(text: string): string | null {
  const candidate = /https:\/\/\S+/.exec(text.replace(TERMINAL_CODES, ''))?.[0]
  if (!candidate || candidate.length > MAX_URL_LENGTH) return null
  try {
    return new URL(candidate).protocol === 'https:' ? candidate : null
  } catch {
    return null
  }
}

/**
 * Runs an agent's terminal sign-in, such as Claude's browser login, for one authenticated
 * socket. The login opens the browser itself; the socket hears the page to open by hand
 * (`url`), may send the code the page shows (`code`), and hears how it ended (`done`). Closing
 * the socket cancels the login.
 */
export function runSignIn(
  ws: WebSocket,
  agent: CompanionAgent,
  context: AgentProcessContext
): void {
  const args = agent.terminalSignIn
  // The socket may have closed while the workspace was prepared; nothing would stop the login.
  if (ws.readyState !== ws.OPEN) return
  if (!args) {
    ws.close(CLOSE_CODES.unsupported, 'This agent signs in inside its own session')
    return
  }
  let child: ChildProcess
  try {
    child = spawnFixed(agent.command, args, {
      cwd: context.workspace,
      searchPath: context.searchPath,
      stdio: ['pipe', 'pipe', 'ignore']
    })
  } catch (error) {
    const notFound = error instanceof ProgramNotFoundError
    ws.close(notFound ? CLOSE_CODES.notFound : CLOSE_CODES.failed, 'Sign-in did not start')
    return
  }
  context.track(child)
  let finished = false
  let urlSent = false
  let pending = ''
  const timer = setTimeout(() => finish(false), SIGN_IN_TIMEOUT_MS)
  timer.unref()

  function finish(ok: boolean) {
    if (finished) return
    finished = true
    clearTimeout(timer)
    sendJSON(ws, { type: 'done', ok })
    if (ws.readyState === ws.OPEN) ws.close(1000, 'Sign-in ended')
    void terminate(child)
  }

  child.stdin?.on('error', () => undefined)
  child.stdout?.on('data', (chunk: Buffer) => {
    if (urlSent) return
    pending = (pending + chunk.toString('utf8')).slice(-MAX_LINE_BUFFER)
    const url = findSignInURL(pending)
    if (!url) return
    urlSent = true
    sendJSON(ws, { type: 'url', url })
  })
  // The app sends a code only after this, so none arrives before the socket listens for it.
  child.once('spawn', () => sendJSON(ws, { type: 'ready' }))
  child.once('error', () => finish(false))
  child.once('close', (code) => finish(code === 0))

  ws.on('message', (data: RawData, isBinary: boolean) => {
    const message = isBinary
      ? null
      : v.safeParse(signInMessageSchema, rawBytes(data).toString('utf8'))
    if (!message?.success) {
      ws.close(CLOSE_CODES.unsupported, 'Unexpected message')
      return
    }
    child.stdin?.write(`${message.output.code}\n`)
  })
  ws.once('close', () => {
    clearTimeout(timer)
    finished = true
    void terminate(child)
  })
}

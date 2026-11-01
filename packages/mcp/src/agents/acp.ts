import type { ChildProcess } from 'node:child_process'

import type { RawData, WebSocket } from 'ws'

import { ProgramNotFoundError, spawnFixed, terminate } from './process'
import type { CompanionAgent } from './registry'
import { CLOSE_CODES, rawBytes, sendJSON } from './socket'

/** Stop reading the agent's output while this much is waiting to reach the app. */
const OUTPUT_HIGH_WATER_BYTES = 8 * 1024 * 1024
const OUTPUT_LOW_WATER_BYTES = 1024 * 1024
/** The agent's diagnostic output the app sees; the rest is dropped. */
const MAX_STDERR_BYTES = 64 * 1024
const MAX_STDERR_CHUNK = 4 * 1024

export interface AgentProcessContext {
  workspace: string
  searchPath: string
  /** Tracks the process so shutting the companion down stops it. */
  track(child: ChildProcess): void
}

export interface AgentPipeContext extends AgentProcessContext {
  /** Rewrites what the app sends the agent; null closes the socket (`createACPFilter`). */
  filter(chunk: Buffer): Buffer | null
}

/**
 * Starts an agent's ACP program for one authenticated socket and pipes its stdio as binary
 * frames: frames from the app go to the program's stdin through `filter`, its stdout comes back.
 * The program's command line is the registry's, and it runs in the companion's workspace.
 * Closing the socket stops the program; the program exiting closes the socket.
 */
export function pipeAgent(ws: WebSocket, agent: CompanionAgent, context: AgentPipeContext): void {
  // The socket may have closed while the workspace was prepared; nothing would stop the agent.
  if (ws.readyState !== ws.OPEN) return
  let child: ChildProcess
  try {
    child = spawnFixed(agent.command, agent.args, {
      cwd: context.workspace,
      searchPath: context.searchPath,
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch (error) {
    const notFound = error instanceof ProgramNotFoundError
    sendJSON(ws, {
      type: 'error',
      reason: notFound ? 'not-found' : 'spawn',
      command: agent.command
    })
    ws.close(notFound ? CLOSE_CODES.notFound : CLOSE_CODES.failed, 'Agent did not start')
    return
  }
  context.track(child)
  const { stdin, stdout, stderr } = child
  if (!stdin || !stdout || !stderr) {
    void terminate(child)
    ws.close(CLOSE_CODES.failed, 'Agent did not start')
    return
  }
  let stderrSent = 0

  child.once('spawn', () => sendJSON(ws, { type: 'ready' }))
  child.once('error', () => {
    sendJSON(ws, { type: 'error', reason: 'spawn', command: agent.command })
    if (ws.readyState === ws.OPEN) ws.close(CLOSE_CODES.failed, 'Agent did not start')
  })
  // `close` comes after the output streams end, so nothing the agent printed is cut off.
  child.once('close', (code, signal) => {
    sendJSON(ws, { type: 'exit', code, signal })
    if (ws.readyState === ws.OPEN) ws.close(1000, 'Agent exited')
  })
  // A program that exits while the app writes must not crash the companion.
  stdin.on('error', () => undefined)

  stdout.on('data', (chunk: Buffer) => {
    if (ws.readyState !== ws.OPEN) return
    ws.send(chunk, { binary: true }, () => {
      if (stdout.isPaused() && ws.bufferedAmount < OUTPUT_LOW_WATER_BYTES) stdout.resume()
    })
    if (ws.bufferedAmount > OUTPUT_HIGH_WATER_BYTES) stdout.pause()
  })
  stderr.on('data', (chunk: Buffer) => {
    if (stderrSent >= MAX_STDERR_BYTES) return
    const text = chunk.subarray(0, MAX_STDERR_CHUNK).toString('utf8')
    stderrSent += text.length
    sendJSON(ws, { type: 'stderr', text })
  })

  ws.on('message', (data: RawData, isBinary: boolean) => {
    // After authenticating, the socket carries only the agent's bytes.
    if (!isBinary) {
      ws.close(CLOSE_CODES.unsupported, 'Binary frames only')
      return
    }
    const bytes = context.filter(rawBytes(data))
    if (bytes === null) {
      ws.close(CLOSE_CODES.unsupported, 'Not an ACP message')
      return
    }
    if (bytes.length > 0 && !stdin.write(bytes)) {
      ws.pause()
      stdin.once('drain', () => ws.resume())
    }
  })
  ws.once('close', () => {
    stdin.end()
    void terminate(child)
  })
}

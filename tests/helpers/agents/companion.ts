import { spawn, type ChildProcess } from 'node:child_process'
import { accessSync, chmodSync, constants, mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { delimiter, isAbsolute, join } from 'node:path'

import { repoPath, testPath } from '#tests/helpers/paths'

/** A port nothing listens on yet, for a companion of the test's own. */
export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

export interface Companion {
  child: ChildProcess
  port: number
  link: string
  /** What the companion prints beside the link for the tab to show. */
  fingerprint: string
}

export interface CompanionOptions {
  /** Puts a stand-in `claude-agent-acp` first on the companion's PATH; true by default. */
  agent?: boolean
  /**
   * Runs the companion with a PATH of only Node, Bun, and the stand-in, and a home folder of its
   * own, so it finds none of the agents the machine running the test installed there.
   */
  isolated?: boolean
}

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Where `command` runs from on this process's PATH. */
function onPath(command: string): string | null {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = join(dir, command)
    if (isAbsolute(dir) && isExecutable(candidate)) return candidate
  }
  return null
}

/** Folders the companion searches whatever its PATH and home are (`packages/mcp/src/agents/path.ts`). */
const SYSTEM_DIRS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: ['/opt/homebrew/bin', '/usr/local/bin', '/opt/local/bin'],
  linux: ['/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin']
}
const AGENT_PROGRAMS = ['claude', 'claude-agent-acp', 'codex', 'codex-acp', 'gemini']

/**
 * Coding agents installed in the system folders the companion always searches, which even an
 * isolated companion finds; a test that needs a computer without agents skips when there are any.
 */
export function systemAgentPrograms(): string[] {
  const dirs = SYSTEM_DIRS[process.platform] ?? []
  return dirs.flatMap((dir) =>
    AGENT_PROGRAMS.map((program) => join(dir, program)).filter(isExecutable)
  )
}

/** Links `programs` into `bin` under their own names, for a PATH that holds only them. */
function linkPrograms(bin: string, programs: Record<string, string | null>): void {
  for (const [name, path] of Object.entries(programs)) {
    if (path) symlinkSync(path, join(bin, name))
  }
}

/**
 * Starts the companion as a person does, `openpencil-connect` with the app's address, and
 * resolves with the link and fingerprint it prints. Its files, and its home when isolated, stay
 * in `dir`, which the caller removes.
 */
export async function startCompanion(
  appURL: string,
  dir: string,
  { agent = true, isolated = false }: CompanionOptions = {}
): Promise<Companion> {
  const bin = join(dir, 'bin')
  mkdirSync(bin)
  if (agent) {
    const program = join(bin, 'claude-agent-acp')
    // It answers as Claude's supported adapter does.
    const fixture = testPath('helpers/agents/acp-agent.ts')
    writeFileSync(
      program,
      `#!/bin/sh\nexec bun "${fixture}" @agentclientprotocol/claude-agent-acp\n`
    )
    chmodSync(program, 0o755)
  }
  if (isolated) linkPrograms(bin, { node: process.execPath, bun: onPath('bun') })
  const searchPath = isolated ? bin : `${bin}${delimiter}${process.env.PATH ?? ''}`
  const port = await freePort()
  const child = spawn(process.execPath, [repoPath('packages/mcp/dist/connect.mjs'), '--no-open'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
      ...process.env,
      ...(isolated ? { HOME: dir } : {}),
      PATH: searchPath,
      PORT: String(port),
      OPENPENCIL_CONNECT_APP_URL: appURL,
      OPENPENCIL_MCP_SOCKET: join(dir, 'mcp.sock'),
      OPENPENCIL_MCP_DISCOVERY_PATH: join(dir, 'mcp.json'),
      OPENPENCIL_MCP_ROOT: dir
    }
  })
  const printed = await new Promise<{ link: string; fingerprint: string }>((resolve, reject) => {
    let output = ''
    child.once('exit', (code) => reject(new Error(`The companion exited (${code}): ${output}`)))
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8')
      const link = /(https?:\/\/\S+#connect=\S+)/.exec(output)?.[1]
      const fingerprint = /shows ([0-9A-F]{3}-[0-9A-F]{3})/.exec(output)?.[1]
      if (link && fingerprint) resolve({ link, fingerprint })
    })
  })
  return { child, port, ...printed }
}

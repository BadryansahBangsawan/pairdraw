import { access, constants, mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { platform } from 'node:os'
import { dirname, join } from 'node:path'

import { claudeCodeCloud, type ClaudeCodeCloud } from './claude-cloud'
import { which } from './path'
import { spawnFixed, terminate } from './process'
import type { CompanionAgent } from './registry'

/** The program the app knows OpenPencil's MCP server by; the companion is that server. */
export const MCP_EXECUTABLE = 'openpencil-mcp-http'
export const MCP_PACKAGE = '@open-pencil/mcp'
const HARNESS_PACKAGE = '@open-pencil/harness'
const PACKAGE_MANAGERS = ['npm', 'bun'] as const

/** What the app's setup reads, in the shape the desktop shell's `agent_lookup` reports. */
export interface CompanionLookup {
  executables: Record<string, string | null>
  versions: Record<string, string | null>
  npmGlobalWritable: boolean | null
  searchPath: string
  /** The cloud Claude Code is set up to use instead of an Anthropic sign-in. */
  claudeCodeCloud: ClaudeCodeCloud | null
}

const OUTPUT_TIMEOUT_MS = 5_000
const MAX_OUTPUT_BYTES = 16_384

/** Runs a found program and returns what it printed, or null when it fails or outlives the timeout. */
async function outputOf(
  command: string,
  args: string[],
  searchPath: string
): Promise<string | null> {
  let child
  try {
    child = spawnFixed(command, args, { searchPath, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
  }
  const running = child
  return new Promise((resolve) => {
    let output = ''
    const timer = setTimeout(() => {
      void terminate(running)
      resolve(null)
    }, OUTPUT_TIMEOUT_MS)
    running.stdout?.on('data', (chunk: Buffer) => {
      if (output.length < MAX_OUTPUT_BYTES) output += chunk.toString('utf8')
    })
    running.once('error', () => {
      clearTimeout(timer)
      resolve(null)
    })
    running.once('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0 ? output : null)
    })
  })
}

/** The folder `npm install --global` writes packages into, below the prefix npm reports. */
export function npmGlobalPackages(prefix: string, runtimePlatform = platform()): string {
  return runtimePlatform === 'win32'
    ? join(prefix, 'node_modules')
    : join(prefix, 'lib', 'node_modules')
}

async function nearestExisting(path: string): Promise<string | null> {
  let current = path
  for (;;) {
    const found = await stat(current).then(
      (info) => info.isDirectory(),
      () => false
    )
    if (found) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/** Whether this process can create files in `dir`, checked by creating and removing one. */
async function canWrite(dir: string): Promise<boolean> {
  const probe = join(dir, `.openpencil-write-check-${process.pid}`)
  try {
    await writeFile(probe, '', { flag: 'wx' })
    await rm(probe, { force: true })
    return true
  } catch {
    return false
  }
}

async function npmGlobalWritable(searchPath: string): Promise<boolean | null> {
  const output = await outputOf('npm', ['prefix', '--global'], searchPath)
  const prefix = output?.split('\n')[0]?.trim()
  if (!prefix) return null
  const dir = await nearestExisting(npmGlobalPackages(prefix))
  return dir ? canWrite(dir) : null
}

/**
 * Looks up the agents in `registry`, the package managers, and OpenPencil's companions, as the
 * desktop shell's `agent_lookup` does. It never starts an agent: only `npm prefix` runs, and of
 * Claude Code's settings only the switches that pick a cloud are read. The MCP server is this
 * program itself, so it reports its own entry and version.
 */
export async function lookupAgents(
  registry: readonly CompanionAgent[],
  options: { searchPath: string; version: string; entry: string }
): Promise<CompanionLookup> {
  const { searchPath } = options
  const names = new Set<string>(PACKAGE_MANAGERS)
  for (const agent of registry) {
    names.add(agent.command)
    if (agent.cliCommand) names.add(agent.cliCommand)
  }
  const executables: Record<string, string | null> = {}
  for (const name of names) executables[name] = which(name, searchPath)
  executables[MCP_EXECUTABLE] = options.entry
  return {
    executables,
    versions: { [MCP_PACKAGE]: options.version, [HARNESS_PACKAGE]: null },
    npmGlobalWritable: executables.npm ? await npmGlobalWritable(searchPath) : null,
    searchPath,
    claudeCodeCloud: await claudeCodeCloud()
  }
}

/** The folder agents start in, outside the person's projects, created on first use. */
export async function ensureWorkspace(path: string): Promise<string> {
  await mkdir(path, { recursive: true, mode: 0o700 })
  await access(path, constants.W_OK)
  return path
}

import { spawn, type ChildProcess, type StdioOptions } from 'node:child_process'
import { platform } from 'node:os'

import { which } from './path'

const isWindows = platform() === 'win32'

/** How long a process may take to exit after SIGTERM before it is killed outright. */
const KILL_GRACE_MS = 2_000

export class ProgramNotFoundError extends Error {
  constructor(readonly command: string) {
    super(`Program not found: ${command}`)
    this.name = 'ProgramNotFoundError'
  }
}

/** Variables of the companion's own that the programs it starts must not inherit. */
function childEnvironment(searchPath: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(process.env)) {
    if (name.startsWith('OPENPENCIL_')) continue
    env[name] = value
  }
  env.PATH = searchPath
  return env
}

export interface FixedCommandOptions {
  searchPath: string
  cwd?: string
  stdio: StdioOptions
}

/**
 * Starts a program from a fixed command line, never through a shell. Windows runs npm's `.cmd`
 * shims only through `cmd.exe`, so those go through it with the resolved path quoted; the
 * arguments are the registry's own constants, never text from a client.
 */
export function spawnFixed(
  command: string,
  args: readonly string[],
  options: FixedCommandOptions
): ChildProcess {
  const resolved = which(command, options.searchPath)
  if (!resolved) throw new ProgramNotFoundError(command)
  const env = childEnvironment(options.searchPath)
  if (isWindows && /\.(cmd|bat)$/i.test(resolved)) {
    if (/["%^&|<>]/.test(resolved) || args.some((arg) => /["%^&|<>\s]/.test(arg))) {
      throw new ProgramNotFoundError(command)
    }
    return spawn(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', `"${[`"${resolved}"`, ...args].join(' ')}"`],
      {
        cwd: options.cwd,
        env,
        stdio: options.stdio,
        windowsHide: true,
        windowsVerbatimArguments: true
      }
    )
  }
  return spawn(resolved, [...args], {
    cwd: options.cwd,
    env,
    stdio: options.stdio,
    windowsHide: true
  })
}

/** Stops a child: SIGTERM first, then SIGKILL if it is still running after a grace period. */
export function terminate(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
    }, KILL_GRACE_MS)
    timer.unref()
    child.once('exit', () => {
      clearTimeout(timer)
      resolve()
    })
    child.kill('SIGTERM')
  })
}

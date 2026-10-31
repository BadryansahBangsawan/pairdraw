import { accessSync, constants, statSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { delimiter, join } from 'node:path'

const isWindows = platform() === 'win32'

/**
 * Folders that commonly hold a globally installed Node or Bun CLI, which a terminal started
 * without the person's shell profile may not have on PATH. Mirrors `desktop/src/agents/path.rs`.
 */
export function candidateDirs(home = homedir(), runtimePlatform = platform()): string[] {
  const dirs = [
    join(home, '.bun', 'bin'),
    join(home, '.local', 'bin'),
    join(home, '.npm-global', 'bin'),
    join(home, '.volta', 'bin'),
    join(home, 'n', 'bin'),
    join(home, '.local', 'share', 'mise', 'shims')
  ]
  if (runtimePlatform === 'darwin')
    dirs.push('/opt/homebrew/bin', '/usr/local/bin', '/opt/local/bin')
  if (runtimePlatform === 'linux') dirs.push('/usr/local/bin', '/home/linuxbrew/.linuxbrew/bin')
  if (runtimePlatform === 'win32' && process.env.APPDATA)
    dirs.push(join(process.env.APPDATA, 'npm'))
  return dirs
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** Appends the candidate folders that exist and the current PATH is missing. */
export function augmentPath(path: string, candidates: readonly string[] = candidateDirs()): string {
  const entries = path.split(delimiter).filter((entry) => entry.length > 0)
  for (const candidate of candidates) {
    if (!entries.includes(candidate) && isDirectory(candidate)) entries.push(candidate)
  }
  return entries.join(delimiter)
}

function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false
    if (isWindows) return true
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Extensions Windows runs a bare command name with, as `PATHEXT` lists them. */
function windowsExtensions(): string[] {
  const listed = (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .map((extension) => extension.trim().toLowerCase())
    .filter((extension) => extension.startsWith('.'))
  return listed.length > 0 ? listed : ['.exe', '.cmd']
}

/** The full path `command` runs from on `searchPath`, as `which` finds it, or null. */
export function which(command: string, searchPath: string): string | null {
  // Only bare names are looked up; a path or a name with separators is never resolved.
  if (!/^[\w.@-]+$/.test(command)) return null
  const extensions = isWindows ? windowsExtensions() : ['']
  for (const dir of searchPath.split(delimiter)) {
    if (!dir) continue
    for (const extension of extensions) {
      const candidate = join(dir, `${command}${extension}`)
      if (isExecutableFile(candidate)) return candidate
    }
  }
  return null
}

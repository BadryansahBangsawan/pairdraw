import { lstat, realpath } from 'node:fs/promises'
import { homedir, platform as hostPlatform } from 'node:os'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'

const MAX_SYMLINK_DEPTH = 16
const MAX_ANCESTOR_DEPTH = 64

type ErrnoError = NodeJS.ErrnoException
function isMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    ['ENOENT', 'ENOTDIR', 'ELOOP'].includes(String((error as ErrnoError).code))
  )
}

/** Whether `target` is `root` itself or a descendant of it. */
function inside(root: string, target: string): boolean {
  const path = relative(root, target)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

/** Walk up from `path` until a realpath() resolves; return it and the unresolved remainder. */
async function realAncestor(path: string): Promise<{ ancestor: string; remainder: string }> {
  let current = resolve(path)
  let remainder = ''
  let iterations = 0
  for (;;) {
    try {
      return { ancestor: await realpath(current), remainder }
    } catch (error) {
      if (!isMissing(error)) throw error
      const parent = dirname(current)
      if (parent === current) {
        throw new Error(`Path resolution depth limit exceeded: ${path}`)
      }
      remainder = sep + basename(current) + remainder
      current = parent
    }
    if (++iterations > MAX_ANCESTOR_DEPTH) {
      throw new Error(`Path resolution depth limit exceeded (possible circular symlinks): ${path}`)
    }
  }
}

/**
 * The canonical realpath of `path`, following a dangling symlink's own target and resolving the
 * nearest existing ancestor. The final component goes through `lstat` so a symlink it points at
 * is reported to the caller rather than silently followed.
 */
async function resolveReal(
  path: string,
  depth: number
): Promise<{ real: string; symlink: boolean }> {
  if (depth > MAX_SYMLINK_DEPTH) {
    throw new Error(`Symlink resolution depth limit exceeded: ${path}`)
  }
  try {
    return { real: await realpath(path), symlink: false }
  } catch (error) {
    if (!isMissing(error)) throw error
    const stats = await lstat(path).catch((cause: unknown) => {
      if (isMissing(cause)) return null
      throw cause
    })
    if (stats !== null) {
      if (stats.isSymbolicLink()) {
        // Do not follow a symlink named in the write path: the target may sit outside the root.
        return { real: await realpath(path).catch(() => path), symlink: true }
      }
      return { real: await realpath(path), symlink: false }
    }
    const { ancestor, remainder } = await realAncestor(path)
    return { real: resolve(ancestor, remainder.slice(sep.length)), symlink: false }
  }
}

/** The project root for agent file output, the working directory on Unix and home on Windows. */
export function resolveAgentRoot(
  requested: string | undefined,
  cwd = process.cwd(),
  runtimePlatform = hostPlatform()
): string {
  return requested?.trim() || (runtimePlatform === 'win32' ? homedir() : cwd)
}

/** Resolve a write path and refuse one that leaves `root` directly or through a symlink. */
export async function safeOutputPath(filePath: string, root: string): Promise<string> {
  const resolvedRoot = resolve(root)
  const rootReal = await resolveReal(resolvedRoot, 0)
  if (rootReal.symlink) throw new Error(`Root path resolves through a symlink: ${root}`)
  const resolved = isAbsolute(filePath) ? resolve(filePath) : resolve(resolvedRoot, filePath)
  const { real: target, symlink } = await resolveReal(resolved, 0)
  if (symlink || !inside(rootReal.real, target)) {
    throw new Error(`Path is outside the allowed root: ${root}`)
  }
  return resolved
}

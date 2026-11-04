import { lstat, readdir, readFile, realpath } from 'node:fs/promises'
import { isAbsolute, join, relative, sep } from 'node:path'

import type { SceneGraph } from '@open-pencil/scene-graph'

import {
  DESIGN_SYSTEM_MAX_FILE_BYTES,
  DESIGN_SYSTEM_MAX_FILES,
  DESIGN_SYSTEM_MAX_TOTAL_BYTES,
  importDesignSystemFiles,
  type DesignSystemFolder,
  type DesignSystemImportResult,
  type DesignSystemIssue,
  type DesignSystemSourceFile
} from '#core/io/formats/design-tokens/project'

const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  '.git',
  '.next',
  'coverage',
  'vendor',
  'out',
  '.turbo'
])

const CONFIG_FILE = /^tailwind\.config\.(?:js|ts|mjs|cjs|cts|mts)$/

function portable(root: string, path: string): string {
  return relative(root, path).split(sep).join('/')
}

function leavesRoot(root: string, target: string): boolean {
  const fromRoot = relative(root, target)
  return fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)
}

function isComponentDirectory(path: string): boolean {
  return path === 'components/ui' || path.endsWith('/components/ui')
}

interface Walk {
  root: string
  files: DesignSystemSourceFile[]
  issues: DesignSystemIssue[]
  componentsPath?: string
  filesRead: number
  bytesRead: number
  stopped: boolean
}

function note(walk: Walk, issue: DesignSystemIssue): void {
  walk.issues.push(issue)
}

/** One issue for the file that crosses a folder budget, then no further reads. */
function overReadBudget(walk: Walk, path: string, size: number): boolean {
  if (walk.stopped) return true
  if (walk.filesRead >= DESIGN_SYSTEM_MAX_FILES) {
    walk.stopped = true
    note(walk, { kind: 'too-many-files', path })
    return true
  }
  if (walk.bytesRead + size > DESIGN_SYSTEM_MAX_TOTAL_BYTES) {
    walk.stopped = true
    note(walk, { kind: 'total-too-large', path })
    return true
  }
  return false
}

async function readText(walk: Walk, path: string, full: string, size: number): Promise<void> {
  try {
    walk.files.push({ path, text: await readFile(full, 'utf8') })
    walk.filesRead += 1
    walk.bytesRead += size
  } catch {
    note(walk, { kind: 'unreadable', path })
  }
}

async function considerFile(walk: Walk, full: string, size: number, path: string): Promise<void> {
  if (walk.stopped) return
  if (size > DESIGN_SYSTEM_MAX_FILE_BYTES) {
    note(walk, { kind: 'file-too-large', path })
    return
  }
  if (CONFIG_FILE.test(full.slice(full.lastIndexOf(sep) + 1))) {
    note(walk, { kind: 'unsupported-config', path })
    return
  }
  if (path !== 'components.json' && !path.endsWith('.css')) return
  if (overReadBudget(walk, path, size)) return
  await readText(walk, path, full, size)
}

async function considerLink(walk: Walk, full: string): Promise<void> {
  const path = portable(walk.root, full)
  let target: string
  try {
    target = await realpath(full)
  } catch {
    note(walk, { kind: 'unreadable', path })
    return
  }
  const stats = await lstat(target).catch(() => undefined)
  if (!stats?.isFile()) return
  if (leavesRoot(walk.root, target)) {
    note(walk, { kind: 'escaped-path', path })
    return
  }
  await considerFile(walk, full, stats.size, path)
}

async function walkDirectory(walk: Walk, directory: string): Promise<void> {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    if (!walk.stopped)
      note(walk, { kind: 'unreadable', path: portable(walk.root, directory) || '.' })
    return
  }
  for (const entry of entries) {
    if (walk.stopped) return
    const full = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      await considerLink(walk, full)
      continue
    }
    if (entry.isDirectory()) {
      if (SKIPPED_DIRECTORIES.has(entry.name)) continue
      const path = portable(walk.root, full)
      if (!walk.componentsPath && isComponentDirectory(path)) walk.componentsPath = path
      await walkDirectory(walk, full)
      continue
    }
    if (entry.isFile()) {
      const stats = await lstat(full).catch(() => undefined)
      if (!stats) {
        note(walk, { kind: 'unreadable', path: portable(walk.root, full) })
        continue
      }
      await considerFile(walk, full, stats.size, portable(walk.root, full))
    }
  }
}

/** Reads a project folder without running its JavaScript or following a link outside it. */
export async function readDesignSystemFolder(root: string): Promise<DesignSystemFolder> {
  let canonical: string
  try {
    canonical = await realpath(root)
  } catch (error) {
    throw new Error(`Cannot read project folder: ${root}`, { cause: error })
  }
  const stats = await lstat(canonical)
  if (!stats.isDirectory()) throw new Error(`Project folder is not a directory: ${root}`)
  const walk: Walk = {
    root: canonical,
    files: [],
    issues: [],
    filesRead: 0,
    bytesRead: 0,
    stopped: false
  }
  await walkDirectory(walk, canonical)
  return { files: walk.files, issues: walk.issues, componentsPath: walk.componentsPath }
}

/** Reads `root` and imports its CSS variables into `graph`. */
export async function importDesignSystemFolder(
  graph: SceneGraph,
  root: string
): Promise<DesignSystemImportResult> {
  return importDesignSystemFiles(graph, await readDesignSystemFolder(root))
}

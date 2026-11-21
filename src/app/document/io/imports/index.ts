import { IS_TAURI } from '@pairdraw/core/constants'
import type { ReadDocumentInput, ReadDocumentWarning } from '@pairdraw/core/io'

import { documentAssetReader } from '@/app/document/io/assets'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

import { importBoundary, isWithinFolder } from './boundary'

/** Only documents a document imports are read for it this way: `.pen` libraries. */
const IMPORTABLE_DOCUMENT = /\.pen$/i

/** Path calls that place a document and the libraries beside it. */
interface ImportPaths {
  dirname: (path: string) => Promise<string>
  homeDir: () => Promise<string>
  isAbsolute: (path: string) => Promise<boolean>
  join: (left: string, right: string) => Promise<string>
  resolve: (directory: string, relative: string) => Promise<string>
  sep: () => string
}

async function desktopImportPaths(): Promise<ImportPaths> {
  const { dirname, homeDir, isAbsolute, join, resolve, sep } = await import('@tauri-apps/api/path')
  return { dirname, homeDir, isAbsolute, join, resolve, sep }
}

/**
 * Opens a library the document at `path` imports, by its path relative to that document, from
 * inside `boundary` only: no absolute path, no path that leaves it, and no link on the way, so a
 * received document cannot bring in files from elsewhere on the disk.
 */
function boundedImportOpener(
  path: string,
  boundary: string,
  paths: ImportPaths
): NonNullable<ReadDocumentInput['openImport']> {
  return async (relative) => {
    const { lstat, readFile } = await import('@tauri-apps/plugin-fs')
    const separator = paths.sep()
    if (await paths.isAbsolute(relative)) return null
    const target = await paths.resolve(await paths.dirname(path), relative)
    if (!IMPORTABLE_DOCUMENT.test(target) || !isWithinFolder(boundary, target, separator)) {
      return null
    }
    let step = boundary
    for (const part of target.slice(boundary.length + 1).split(separator)) {
      step = await paths.join(step, part)
      const info = await lstat(step).catch(() => null)
      if (!info || info.isSymlink) return null
    }
    const data = await readFile(target).catch(() => null)
    if (!data) return null
    return {
      name: target,
      data,
      readAsset: documentAssetReader(target),
      openImport: boundedImportOpener(target, boundary, paths)
    }
  }
}

/**
 * Opens the documents a document opened from `path` imports, such as the `.pen` libraries a `.pen`
 * document names, by their path relative to it. They may sit in a nearby folder, as a shared
 * library does, within `importBoundary` of the document. Each reads its own images from its
 * folder and its own imports relative to itself. A browser, or a file dropped in with no path,
 * has no folder to read beside, so such documents import nothing. A caller may pass the path
 * calls; otherwise the desktop path API is used.
 */
export function documentImportOpener(
  path: string | undefined,
  paths?: ImportPaths
): ReadDocumentInput['openImport'] {
  if (!path || (!IS_TAURI && paths === undefined)) return undefined
  let opener: Promise<NonNullable<ReadDocumentInput['openImport']>> | undefined
  return async (relative) => {
    if (opener === undefined) {
      const pending = (async () => {
        const api = paths ?? (await desktopImportPaths())
        const home = await api.homeDir().catch(() => '')
        return boundedImportOpener(
          path,
          importBoundary(await api.dirname(path), home, api.sep()),
          api
        )
      })().catch((error: unknown) => {
        if (opener === pending) opener = undefined
        throw error
      })
      opener = pending
    }
    return (await opener)(relative)
  }
}

/** Tells the user what a document opened without, such as libraries it imports. */
export function reportReadWarnings(
  documentName: string,
  warnings: readonly ReadDocumentWarning[] | undefined
): void {
  const messages = notificationMessages.get()
  for (const warning of warnings ?? []) {
    if (warning.kind === 'unknown-variable') {
      toast.warning(messages.unknownVariables({ names: warning.names.join(', ') }))
      continue
    }
    if (warning.kind === 'missing-image') {
      toast.warning(messages.missingImages({ names: warning.urls.join(', ') }))
      continue
    }
    const params = { name: documentName, paths: warning.paths.join(', ') }
    if (warning.reason === 'unreadable') toast.warning(messages.importedLibrariesUnreadable(params))
    // On the desktop only a file dropped in comes without a path to read its libraries beside.
    else if (IS_TAURI) toast.warning(messages.importedLibrariesNeedOpenDialog(params))
    else toast.warning(messages.importedLibrariesNeedDesktop(params))
  }
}

import { IS_TAURI } from '@open-pencil/core/constants'
import type { ReadDocumentInput, ReadDocumentWarning } from '@open-pencil/core/io'

import { documentAssetReader } from '@/app/document/io/assets'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

import { importBoundary, isWithinFolder } from './boundary'

/** Only documents a document imports are read for it this way: `.pen` libraries. */
const IMPORTABLE_DOCUMENT = /\.pen$/i

/**
 * Opens a library the document at `path` imports, by its path relative to that document, from
 * inside `boundary` only: no absolute path, no path that leaves it, and no link on the way, so a
 * received document cannot bring in files from elsewhere on the disk.
 */
function boundedImportOpener(
  path: string,
  boundary: string
): NonNullable<ReadDocumentInput['openImport']> {
  return async (relative) => {
    const [{ dirname, isAbsolute, join, resolve, sep }, { lstat, readFile }] = await Promise.all([
      import('@tauri-apps/api/path'),
      import('@tauri-apps/plugin-fs')
    ])
    const separator = sep()
    if (await isAbsolute(relative)) return null
    const target = await resolve(await dirname(path), relative)
    if (!IMPORTABLE_DOCUMENT.test(target) || !isWithinFolder(boundary, target, separator)) {
      return null
    }
    let step = boundary
    for (const part of target.slice(boundary.length + 1).split(separator)) {
      step = await join(step, part)
      const info = await lstat(step).catch(() => null)
      if (!info || info.isSymlink) return null
    }
    const data = await readFile(target).catch(() => null)
    if (!data) return null
    return {
      name: target,
      data,
      readAsset: documentAssetReader(target),
      openImport: boundedImportOpener(target, boundary)
    }
  }
}

/**
 * Opens the documents a document opened from `path` imports, such as the `.pen` libraries a `.pen`
 * document names, by their path relative to it. They may sit in a nearby folder, as a shared
 * library does, within `importBoundary` of the document. Each reads its own images from its
 * folder and its own imports relative to itself. A browser, or a file dropped in with no path,
 * has no folder to read beside, so such documents import nothing.
 */
export function documentImportOpener(path: string | undefined): ReadDocumentInput['openImport'] {
  if (!IS_TAURI || !path) return undefined
  let opener: Promise<NonNullable<ReadDocumentInput['openImport']>> | undefined
  return async (relative) => {
    opener ??= (async () => {
      const { dirname, homeDir, sep } = await import('@tauri-apps/api/path')
      const home = await homeDir().catch(() => '')
      return boundedImportOpener(path, importBoundary(await dirname(path), home, sep()))
    })()
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
    const params = { name: documentName, paths: warning.paths.join(', ') }
    if (warning.reason === 'unreadable') toast.warning(messages.importedLibrariesUnreadable(params))
    // On the desktop only a file dropped in comes without a path to read its libraries beside.
    else if (IS_TAURI) toast.warning(messages.importedLibrariesNeedOpenDialog(params))
    else toast.warning(messages.importedLibrariesNeedDesktop(params))
  }
}

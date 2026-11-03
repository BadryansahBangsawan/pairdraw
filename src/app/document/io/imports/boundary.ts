/** How many folders above the opened document the libraries it imports may sit, as `../../` reaches. */
const MAX_IMPORT_ASCENT = 2

/** Whether `path` is `folder` or lies inside it, with `separator` between a path's folders. */
export function isWithinFolder(folder: string, path: string, separator: string): boolean {
  return path === folder || path.startsWith(folder + separator)
}

/**
 * The folder every library a document in `folder` imports, and every library those import, must
 * lie in: up to two folders above the document, as sibling projects in one workspace sit, but
 * never the home folder, a folder holding it, or a drive or file system root. A document in the
 * home folder itself, or on a host that cannot tell where home is, imports only from inside its
 * own folder.
 */
export function importBoundary(folder: string, home: string, separator: string): string {
  if (!home) return folder
  let boundary = folder
  for (let step = 0; step < MAX_IMPORT_ASCENT; step++) {
    const cut = boundary.lastIndexOf(separator)
    const parent = boundary.slice(0, cut)
    // `/x` and `C:\x` have the root above them, which holds every folder.
    if (cut <= 0 || !parent.includes(separator)) break
    if (isWithinFolder(parent, home, separator)) break
    boundary = parent
  }
  return boundary
}

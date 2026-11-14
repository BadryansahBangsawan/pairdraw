import { dirname, isAbsolute, join } from 'pathe'

import {
  importedDocument,
  parseImportedImageURL,
  parsePenDocument,
  type PenDocument,
  type PenImport
} from '@pairdraw/pen'

import type { ReadDocumentInput, ReadDocumentWarning } from '#core/io/types'

/** How deep a chain of documents importing one another is read: sixteen documents. */
const MAX_IMPORT_DEPTH = 16

/** A document read for another that imports it, with the documents it imports in turn. */
export interface OpenedImport {
  input: ReadDocumentInput
  imports: ReadonlyMap<string, OpenedImport>
}

/** The documents a document imports, read, by the alias it names each one with. */
export interface LoadedImports {
  /** As `buildPenGraph` takes them. */
  imports: Map<string, PenImport>
  /** As the host gave them, to read their files with. */
  opened: Map<string, OpenedImport>
}

const UNRESOLVED_REASONS: readonly ReadDocumentWarning['reason'][] = [
  'no-file-access',
  'unreadable'
]

/** The imports a document opened without, by why. */
export class UnresolvedImports {
  readonly #paths: Record<ReadDocumentWarning['reason'], Set<string>> = {
    'no-file-access': new Set(),
    unreadable: new Set()
  }

  add(reason: ReadDocumentWarning['reason'], path: string): void {
    this.#paths[reason].add(path)
  }

  warnings(): ReadDocumentWarning[] {
    return UNRESOLVED_REASONS.flatMap((reason) => {
      const paths = this.#paths[reason]
      return paths.size > 0 ? [{ kind: 'unresolved-imports', reason, paths: [...paths] }] : []
    })
  }
}

/** A document the host opened, or null for one that is no `.pen` document. */
function parseImported(input: ReadDocumentInput): PenDocument | null {
  try {
    return parsePenDocument(new TextDecoder().decode(input.data))
  } catch {
    return null
  }
}

/** An import the host opened, or null for one it could not open or that is no `.pen` document. */
type OpenedDocument = { input: ReadDocumentInput; doc: PenDocument } | null

/** What one read of a document and its imports shares across every document it reads. */
interface ImportRead {
  unresolved: UnresolvedImports
  /** Each import by its path from the document being opened, so the host opens a file once. */
  opened: Map<string, OpenedDocument>
  /** The imports of each document read, by the host's name for it, so each is read once. */
  loaded: Map<string, LoadedImports>
}

/**
 * The path an import is named by in warnings, from the document being opened: as that document
 * writes it for its own imports, and as the import resolves from there for its imports' imports.
 */
function importPath(at: string, path: string): string {
  return at === '' || isAbsolute(path) ? path : join(dirname(at), path)
}

async function openImported(input: ReadDocumentInput, path: string): Promise<OpenedDocument> {
  const opened = await input.openImport?.(path).catch(() => null)
  const doc = opened ? parseImported(opened) : null
  return opened && doc ? { input: opened, doc } : null
}

/**
 * The documents `doc` imports, opened through `input`, which `doc` was read from, and named as
 * `doc` names them, with the documents they import in turn. `at` is `doc`'s path from the document
 * being opened; `reading` holds the host's names for the documents importing `doc`, so a document
 * importing itself through others, the opened one included, is left out where it comes round.
 * Imports are opened one after another, so a document many import is opened and read once.
 */
async function loadImports(
  doc: PenDocument,
  input: ReadDocumentInput,
  read: ImportRead,
  at: string,
  reading: ReadonlySet<string>
): Promise<LoadedImports> {
  const loaded: LoadedImports = { imports: new Map(), opened: new Map() }
  for (const [alias, path] of Object.entries(doc.imports ?? {})) {
    const shown = importPath(at, path)
    if (!input.openImport) {
      read.unresolved.add('no-file-access', shown)
      continue
    }
    if (reading.size > MAX_IMPORT_DEPTH) continue
    let opened = read.opened.get(shown)
    if (opened === undefined) {
      opened = await openImported(input, path)
      read.opened.set(shown, opened)
    }
    if (!opened) {
      read.unresolved.add('unreadable', shown)
      continue
    }
    const name = opened.input.name ?? shown
    if (reading.has(name)) continue
    let nested = read.loaded.get(name)
    if (!nested) {
      nested = await loadImports(opened.doc, opened.input, read, shown, new Set([...reading, name]))
      read.loaded.set(name, nested)
    }
    loaded.imports.set(alias, importedDocument(alias, path, opened.doc, nested.imports))
    loaded.opened.set(alias, { input: opened.input, imports: nested.opened })
  }
  return loaded
}

/**
 * The documents `doc` imports, opened through `input`, which `doc` was read from, with the
 * documents they import in turn. An import the host cannot open or that is no `.pen` document is
 * left out and reported to `unresolved`, by its path as `doc` writes it, or for an import's own
 * imports as it resolves from `doc`. The host's name for `doc` is the path its imports resolve
 * to, so an import that leads back to it is recognized.
 */
export function loadPenImports(
  doc: PenDocument,
  input: ReadDocumentInput,
  unresolved: UnresolvedImports
): Promise<LoadedImports> {
  const read: ImportRead = { unresolved, opened: new Map(), loaded: new Map() }
  return loadImports(doc, input, read, '', new Set([input.name ?? '']))
}

/**
 * The bytes of an image an imported document draws, by the name `buildPenGraph` reads it with,
 * read beside the document that names it; null when no import has it or the host cannot read it.
 */
export async function readImportedImage(
  opened: ReadonlyMap<string, OpenedImport>,
  url: string
): Promise<Uint8Array | null> {
  const parsed = parseImportedImageURL(url)
  const source = parsed ? opened.get(parsed.alias) : undefined
  if (!parsed || !source) return null
  if (parseImportedImageURL(parsed.url)) return readImportedImage(source.imports, parsed.url)
  return (await source.input.readAsset?.(parsed.url).catch(() => null)) ?? null
}

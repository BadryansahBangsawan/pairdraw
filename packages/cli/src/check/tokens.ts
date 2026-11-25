import { readFile, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, sep } from 'node:path'

import {
  planTokenSync,
  readTokenSourceFiles,
  tokenSourceForFiles,
  type DesignSystemIssue,
  type DesignTokenSourceFile,
  type TokenDrift
} from '@pairdraw/core/io/formats/design-tokens'
import { readDesignSystemFolder } from '@pairdraw/core/node/design-system'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { loadDocument, populateWholeDocument } from '#cli/headless'

/** How the document's variables compare with the code its tokens come from. */
export interface TokenCheck {
  inSync: boolean
  drift: TokenDrift[]
  issues: DesignSystemIssue[]
}

/** A stylesheet or token file as it is, or a project folder's stylesheets as an import reads them. */
export async function readTokenSource(
  path: string
): Promise<{ files: DesignTokenSourceFile[]; issues: DesignSystemIssue[] }> {
  if ((await stat(path)).isDirectory()) return readDesignSystemFolder(path)
  return { files: [{ path: basename(path), text: await readFile(path, 'utf8') }], issues: [] }
}

/** Where code is from the document's folder; none where no relative path reaches it. */
export function pathFromDocument(document: string, sourcePath: string): string | undefined {
  const path = relative(dirname(document), sourcePath)
  // On Windows a file on another drive has no relative path: `relative` returns it whole.
  return isAbsolute(path) ? undefined : path.split(sep).join('/')
}

/**
 * Compares `graph`'s variables with the stylesheet or project folder at `sourcePath`, as
 * `pairdraw tokens --check` and `pairdraw check` report it. Read-only: the graph is not changed.
 */
export async function tokenDrift(
  graph: SceneGraph,
  sourcePath: string,
  documentPath?: string
): Promise<TokenCheck> {
  const source = await readTokenSource(sourcePath)
  const { bundles, issues } = readTokenSourceFiles(graph, source.files)
  issues.unshift(...source.issues)
  // The link records its path from the document's folder; a stylesheet is also found by name.
  const fromDocument = documentPath ? pathFromDocument(documentPath, sourcePath) : undefined
  const link = tokenSourceForFiles(graph, source.files, fromDocument)
  const { drift } = planTokenSync(graph, bundles, link)
  return { inSync: drift.length === 0, drift, issues }
}

/** The comparison for a document `tokens --check` reads itself. */
export async function tokenDriftForFile(
  documentPath: string,
  sourcePath: string
): Promise<TokenCheck> {
  const graph = await loadDocument(documentPath)
  populateWholeDocument(graph)
  return tokenDrift(graph, sourcePath, documentPath)
}

/** One differing token as a line, for the CLI and the report. */
export function driftLine(drift: TokenDrift): string {
  const where = `${drift.collection} / ${drift.variable}${drift.mode ? ` (${drift.mode})` : ''}`
  const values = [
    drift.code === undefined ? undefined : `code ${drift.code}`,
    drift.canvas === undefined ? undefined : `canvas ${drift.canvas}`
  ].filter((part) => part !== undefined)
  return `${where}: ${drift.kind}${values.length > 0 ? `, ${values.join(', ')}` : ''}`
}

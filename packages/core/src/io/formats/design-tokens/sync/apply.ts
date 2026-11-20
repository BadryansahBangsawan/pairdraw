import { posix } from 'pathe'

import type { SceneGraph } from '@pairdraw/scene-graph'
import { randomHex } from '@pairdraw/scene-graph/random'
import {
  readTokenSources,
  tokenSourcesPluginData,
  type TokenSource
} from '@pairdraw/scene-graph/token-sources'

import { importTokensIntoGraph } from '#core/io/formats/design-tokens/apply'
import type { DesignSystemIssue } from '#core/io/formats/design-tokens/project'
import type { DesignTokenBundle, DesignTokenSourceFile } from '#core/io/formats/design-tokens/read'

import {
  planTokenSync,
  tokenSnapshot,
  type TokenDrift,
  type TokenSyncChoice,
  type TokenSyncResolution
} from './drift'
import { readTokenSourceFiles } from './files'

/** A link as a sync records it, before it learns what the code holds. */
export type TokenSourceLink = Omit<TokenSource, 'snapshot' | 'syncedAt'>

/**
 * The document's links with `link` recorded as synced now, its snapshot taken from the code once
 * the resolution's imports are applied. A link already there keeps its place.
 */
export function syncedTokenSources(
  graph: SceneGraph,
  link: TokenSourceLink,
  bundles: readonly DesignTokenBundle[],
  resolution: TokenSyncResolution
): TokenSource[] {
  const sources = readTokenSources(graph)
  const previous = sources.find((source) => source.id === link.id)
  const synced: TokenSource = {
    ...link,
    syncedAt: new Date().toISOString(),
    ...tokenSnapshot(graph, bundles, previous, resolution.undecided)
  }
  return previous
    ? sources.map((source) => (source === previous ? synced : source))
    : [...sources, synced]
}

/** Applies a resolved sync straight to a graph and records the link, for tools and the CLI. */
export function syncTokensIntoGraph(
  graph: SceneGraph,
  link: TokenSourceLink,
  bundles: readonly DesignTokenBundle[],
  resolution: TokenSyncResolution
): void {
  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  for (const plan of resolution.plans) importTokensIntoGraph(graph, pageId, plan)
  graph.updateNode(graph.rootId, {
    pluginData: tokenSourcesPluginData(graph, syncedTokenSources(graph, link, bundles, resolution))
  })
}

/**
 * The link some files of linked code belong to. Given `path`, their place from the document's
 * folder, it is the link recorded there, or one recorded by name only; two files of one name in
 * different folders are two links. Without it, a link whose path or file name is one of theirs.
 * Files no link names are compared without a snapshot.
 */
export function tokenSourceForFiles(
  graph: SceneGraph,
  files: readonly DesignTokenSourceFile[],
  path?: string
): TokenSource | undefined {
  const sources = readTokenSources(graph)
  if (path !== undefined) {
    const place = posix.normalize(path)
    return (
      sources.find((source) => source.path && posix.normalize(source.path) === place) ??
      sources.find((source) => !source.path && source.name === posix.basename(place))
    )
  }
  const paths = files.map((file) => posix.normalize(file.path))
  return (
    sources.find((source) => source.path && paths.includes(posix.normalize(source.path))) ??
    sources.find((source) => paths.some((entry) => posix.basename(entry) === source.name))
  )
}

/** A link for files no link names yet, named after where they are. */
function newLink(
  files: readonly DesignTokenSourceFile[],
  path: string | undefined
): TokenSourceLink {
  const stylesheets = files.every((file) => posix.basename(file.path).endsWith('.css'))
  return {
    id: randomHex(12),
    kind: stylesheets ? (files.length > 1 ? 'folder' : 'css') : 'dtcg',
    name: posix.basename(path ?? files.at(0)?.path ?? 'tokens'),
    ...(path ? { path } : {})
  }
}

export interface TokenFilesSync {
  /** Tokens that came in or had a side picked. */
  applied: number
  /** Drift left for a person to review. */
  left: TokenDrift[]
  issues: DesignSystemIssue[]
}

/**
 * Syncs a headless document with linked code read from files, for tools and the CLI: what changed
 * only in code and what is new there comes in, a token changed on the canvas or on both sides
 * takes `conflicts` (left as it is by default), and the link is recorded under `path`, a path
 * from the document's folder, when one is known.
 */
export function syncTokenFiles(
  graph: SceneGraph,
  files: readonly DesignTokenSourceFile[],
  options: { conflicts?: TokenSyncChoice; path?: string } = {}
): TokenFilesSync {
  const { bundles, issues } = readTokenSourceFiles(graph, files)
  const linked = tokenSourceForFiles(graph, files, options.path)
  const sync = planTokenSync(graph, bundles, linked)
  const resolution = sync.resolve((drift) =>
    drift.kind === 'missing' ? undefined : options.conflicts
  )
  syncTokensIntoGraph(graph, linked ?? newLink(files, options.path), bundles, resolution)
  return { applied: resolution.applied, left: resolution.undecided, issues }
}

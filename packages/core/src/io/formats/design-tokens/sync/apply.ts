import { posix } from 'pathe'

import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  readTokenSources,
  tokenSourcesPluginData,
  type TokenSource
} from '@pairdraw/scene-graph/token-sources'

import { importTokensIntoGraph } from '#core/io/formats/design-tokens/apply'
import type { DesignTokenBundle, DesignTokenSourceFile } from '#core/io/formats/design-tokens/read'

import { tokenSnapshot, type TokenSyncResolution } from './drift'

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
 * The link some files of linked code belong to: one whose path, or else whose file name, is one
 * of theirs. Files no link names are compared without a snapshot.
 */
export function tokenSourceForFiles(
  graph: SceneGraph,
  files: readonly DesignTokenSourceFile[]
): TokenSource | undefined {
  const sources = readTokenSources(graph)
  const paths = files.map((file) => posix.normalize(file.path))
  return (
    sources.find((source) => source.path && paths.includes(posix.normalize(source.path))) ??
    sources.find((source) => paths.some((path) => posix.basename(path) === source.name))
  )
}

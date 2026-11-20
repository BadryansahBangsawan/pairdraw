import * as v from 'valibot'

import type { SceneGraph } from '../graph'
import { readPluginData, withPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import type { PluginDataEntry } from '../types'
import { relativeTokenPathSchema, type TokenSource } from './schema'

const { tokenSources } = PAIRDRAW_PLUGIN_DATA

/**
 * The code a document's variables are linked to, with what it held at the last sync. The links
 * live in Pairdraw's plugin data on the document node, so they travel with the `.fig` file and
 * Figma ignores them; where each file is on this computer stays with the app, not the document.
 */
export function readTokenSources(graph: SceneGraph): TokenSource[] {
  return readPluginData(graph.getNode(graph.rootId)?.pluginData, tokenSources) ?? []
}

/**
 * The document node's plugin data holding `sources` in place of its links, for an edit that
 * writes them, undoably or not, as one change to the node.
 */
export function tokenSourcesPluginData(
  graph: SceneGraph,
  sources: readonly TokenSource[]
): PluginDataEntry[] {
  // A path that is not relative would make the reader drop the whole link; the link keeps going
  // by its name instead.
  const stored = sources.map(({ path, ...source }) =>
    path !== undefined && v.is(relativeTokenPathSchema, path) ? { ...source, path } : source
  )
  return withPluginData(
    graph.getNode(graph.rootId)?.pluginData ?? [],
    tokenSources,
    stored.length > 0 ? stored : undefined
  )
}

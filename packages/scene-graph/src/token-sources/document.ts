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
 * The links with their snapshots keyed by the graph's variable and mode ids. A format that keys
 * variables and modes by name, such as `.pen`, gives them new ids when it reads them back; the
 * names the file stored when it was saved, or the last sync's where the file recorded none, find
 * them again. `names` and the snapshot's token identities are kept as they were. Links whose
 * variables are all gone are left as they are.
 */
export function rekeyTokenSources(
  graph: SceneGraph,
  sources: readonly TokenSource[]
): TokenSource[] {
  const collectionsByName = new Map(
    [...graph.variableCollections.values()].map((collection) => [collection.name, collection])
  )
  const variablesByKey = new Map<string, string>()
  for (const variable of graph.variables.values()) {
    const collection = graph.variableCollections.get(variable.collectionId)
    if (collection) variablesByKey.set(`${collection.name}/${variable.name}`, variable.id)
  }
  const currentModeId = (collectionName: string, modeId: string, modes: TokenSource['modes']) => {
    const name = modes?.[collectionName]?.[modeId]
    if (name === undefined) return modeId
    const mode = collectionsByName.get(collectionName)?.modes.find((entry) => entry.name === name)
    return mode?.modeId ?? modeId
  }
  return sources.map((source) => {
    const ids = new Map<string, string>()
    for (const [id, key] of Object.entries(source.currentNames ?? source.names ?? {})) {
      const current = variablesByKey.get(key)
      if (current !== undefined) ids.set(id, current)
    }
    if (ids.size === 0) return source
    const collectionOf = (id: string) => {
      const variable = graph.variables.get(id)
      return variable ? graph.variableCollections.get(variable.collectionId)?.name : undefined
    }
    const snapshot: TokenSource['snapshot'] = {}
    for (const [oldId, values] of Object.entries(source.snapshot)) {
      const id = ids.get(oldId) ?? oldId
      const collection = collectionOf(id)
      const entry: Record<string, string> = {}
      for (const [modeId, signature] of Object.entries(values)) {
        entry[collection ? currentModeId(collection, modeId, source.modes) : modeId] = signature
      }
      snapshot[id] = { ...snapshot[id], ...entry }
    }
    const names = Object.fromEntries(
      Object.entries(source.names ?? {}).map(([id, key]) => [ids.get(id) ?? id, key])
    )
    const modes = source.modes
      ? Object.fromEntries(
          Object.entries(source.modes).map(([collectionName, byMode]) => [
            collectionName,
            Object.fromEntries(
              Object.entries(byMode).map(([modeId, name]) => [
                currentModeId(collectionName, modeId, source.modes),
                name
              ])
            )
          ])
        )
      : undefined
    return { ...source, snapshot, names, ...(modes ? { modes } : {}) }
  })
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

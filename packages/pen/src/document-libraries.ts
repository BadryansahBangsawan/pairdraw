import type { SceneGraph, SourceLibraryPublication } from '@pairdraw/scene-graph'
import {
  PAIRDRAW_PLUGIN_DATA,
  readPluginData,
  withPluginData
} from '@pairdraw/scene-graph/plugin-data'

import type { PenDocument } from './schema'

const { penImports: penImportsField, sourceLibraryPublication: publicationField } =
  PAIRDRAW_PLUGIN_DATA

type LibraryLinks = Pick<PenDocument, 'imports' | 'enabledLibraries' | 'sourceLibraryPublication'>

/**
 * The `.pen` documents a graph imports, by the alias its file names each one with. The reader
 * stores them beside the design memory, so a save writes the same `imports` back.
 */
export function readPenImports(graph: SceneGraph): Record<string, string> | undefined {
  const root = graph.getNode(graph.rootId)
  const imports = readPluginData(root?.pluginData, penImportsField)
  return imports && Object.keys(imports).length > 0 ? imports : undefined
}

/** The library this document publishes as, or null when it publishes none. */
export function readSourceLibraryPublication(graph: SceneGraph): SourceLibraryPublication | null {
  const root = graph.getNode(graph.rootId)
  return readPluginData(root?.pluginData, publicationField) ?? null
}

/**
 * Keeps the library links a `.pen` file carries on the graph it reads into: the documents it
 * imports (their paths, which resolve their components and variables on a reopen), the libraries
 * it switched on, and the library it publishes as.
 */
export function writeLibraryLinks(graph: SceneGraph, doc: LibraryLinks): void {
  const root = graph.getNode(graph.rootId)
  if (!root) return
  let pluginData = root.pluginData
  if (doc.imports && Object.keys(doc.imports).length > 0) {
    pluginData = withPluginData(pluginData, penImportsField, doc.imports)
  }
  if (doc.sourceLibraryPublication) {
    pluginData = withPluginData(pluginData, publicationField, doc.sourceLibraryPublication)
  }
  if (pluginData !== root.pluginData) graph.updateNode(root.id, { pluginData })
  if (doc.enabledLibraries) {
    graph.enabledLibraries = new Map(
      doc.enabledLibraries.map((binding) => [binding.libraryId, binding])
    )
  }
}

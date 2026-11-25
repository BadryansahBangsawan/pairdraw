import type { SceneGraph } from '@pairdraw/scene-graph'

/** `3 variables`, with the noun matching the count. */
function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * What a draw.io file could not hold, as facts rather than a sentence: the app shows these in the
 * reader's language, while the CLI and MCP print `drawioWriteWarningText` of each.
 */
export interface DrawioWriteWarning {
  kind: 'unbound-variables'
  /** Variables the graph holds, none of which draw.io can carry. */
  variables: number
  /** The collections those variables belong to, by name. */
  collections: string[]
  /** Layers painted through a binding, which open without it. */
  layers: number
}

/**
 * What a draw.io file cannot hold. draw.io has no variable model and no style that reads one, so
 * a document that paints with variables arrives in draw.io as plain colours and comes back
 * unbound. The writer names that loss instead of writing a file that looks complete.
 */
export function drawioWriteWarnings(graph: SceneGraph): DrawioWriteWarning[] {
  const variables = graph.getLiveVariables().length
  if (variables === 0) return []
  const collections = graph.getLiveCollections().map((collection) => collection.name)
  const layers = [...graph.nodes.values()].filter(
    (node) => Object.keys(node.boundVariables).length > 0
  ).length
  return [{ kind: 'unbound-variables', variables, collections, layers }]
}

/** The English sentence a write warning has always been reported as. */
export function drawioWriteWarningText(warning: DrawioWriteWarning): string {
  const dropped = `draw.io has no variables: ${counted(warning.variables, 'variable', 'variables')} in ${counted(warning.collections.length, 'collection', 'collections')} (${warning.collections.join(', ')}) not written`
  if (warning.layers === 0) return dropped
  const users =
    warning.layers === 1
      ? '1 layer that uses one lost the binding'
      : `${counted(warning.layers, 'layer', 'layers')} that use them lost the binding`
  return `${dropped}, and ${users}`
}

import type { SceneGraph } from '@pairdraw/scene-graph'

/** `3 variables`, with the noun matching the count. */
function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/**
 * What a draw.io file cannot hold. draw.io has no variable model and no style that reads one, so
 * a document that paints with variables arrives in draw.io as plain colours and comes back
 * unbound. The writer names that loss instead of writing a file that looks complete.
 */
export function drawioDroppedWarnings(graph: SceneGraph): string[] {
  const variables = graph.variables.size
  if (variables === 0) return []
  const names = [...graph.variableCollections.values()].map((collection) => collection.name)
  const dropped = `draw.io has no variables: ${counted(variables, 'variable', 'variables')} in ${counted(names.length, 'collection', 'collections')} (${names.join(', ')}) not written`
  const bound = [...graph.nodes.values()].filter(
    (node) => Object.keys(node.boundVariables).length > 0
  ).length
  if (bound === 0) return [dropped]
  const users =
    bound === 1
      ? '1 layer that uses one lost the binding'
      : `${counted(bound, 'layer', 'layers')} that use them lost the binding`
  return [`${dropped}, and ${users}`]
}

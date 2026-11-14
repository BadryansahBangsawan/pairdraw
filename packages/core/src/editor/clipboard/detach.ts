import type { SceneGraph, SceneNode, StyleRun } from '@pairdraw/scene-graph'
import { STYLE_LINK_FIELDS } from '@pairdraw/scene-graph/shared-styles'
import {
  resolvedNumericBindings,
  resolvedPaintBindings,
  resolvedRunBindings,
  resolvedValueBindings
} from '@pairdraw/scene-graph/variables'

/**
 * The values a layer's variable bindings show in the document it is copied from, for the fields
 * whose stored value differs, so pasting it unlinked elsewhere keeps how it looked.
 */
export function resolvedClipboardBindings(
  graph: SceneGraph,
  node: SceneNode
): Partial<SceneNode> | undefined {
  const bindsCharacters = node.styleRuns.some((run) => run.style.boundVariables)
  if (Object.keys(node.boundVariables).length === 0 && !bindsCharacters) return undefined
  const resolved = {
    ...resolvedNumericBindings(graph, node),
    ...resolvedValueBindings(graph, node),
    ...resolvedRunBindings(graph, node),
    ...resolvedPaintBindings(graph, node)
  }
  return Object.keys(resolved).length > 0 ? structuredClone(resolved) : undefined
}

function unlinkedRun(run: StyleRun): StyleRun {
  const { boundVariables, textStyleId, fillStyleId } = run.style
  if (!boundVariables && !textStyleId && !fillStyleId) return run
  const { boundVariables: _variables, textStyleId: _text, fillStyleId: _fill, ...style } = run.style
  return { ...run, style }
}

/**
 * A copied layer pasted as is: the values it showed, with no variables, modes, or styles,
 * which belong to the document it came from.
 */
export function detachClipboardNode(node: SceneNode, resolved?: Partial<SceneNode>): void {
  if (resolved) Object.assign(node, structuredClone(resolved))
  node.boundVariables = {}
  node.variableBindingScales = {}
  node.variableModes = {}
  for (const field of STYLE_LINK_FIELDS) node[field] = null
  node.styleRuns = node.styleRuns.map(unlinkedRun)
}

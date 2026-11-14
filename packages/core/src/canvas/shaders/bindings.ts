import type { SceneGraph } from '@pairdraw/scene-graph'
import { colorToHexRaw } from '@pairdraw/scene-graph/color'
import type { ShaderUniformValue } from '@pairdraw/scene-graph/shaders'
import { resolveVariableForNode } from '@pairdraw/scene-graph/variables'

/**
 * The uniform values a shader paint or effect draws with: the values the document stores, each
 * one replaced by the value its bound variable holds for `nodeId`. A binding whose variable is
 * gone falls back to the stored value.
 */
export function boundUniformValues(
  uniforms: Readonly<Record<string, ShaderUniformValue>> | undefined,
  bindings: Readonly<Record<string, string>> | undefined,
  graph: SceneGraph,
  nodeId: string
): Readonly<Record<string, ShaderUniformValue>> {
  if (!bindings) return uniforms ?? {}
  const values: Record<string, ShaderUniformValue> = { ...uniforms }
  for (const [name, variableId] of Object.entries(bindings)) {
    const resolved = resolveVariableForNode(graph, nodeId, variableId)
    if (resolved === undefined) continue
    values[name] = typeof resolved === 'object' ? colorToHexRaw(resolved) : resolved
  }
  return values
}

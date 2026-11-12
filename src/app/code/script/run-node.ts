/**
 * Runs one SCRIPT node: reads its source and inputs, resolves bound variables on the host, asks
 * the sandbox for layers, and draws them under the node. A run adds no undo step; the script
 * node's own render is not a document edit, and its output is not something a person moves.
 */
import type { SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { OPEN_PENCIL_PLUGIN_DATA, readPluginData } from '@open-pencil/scene-graph/plugin-data'
import {
  resolveScriptInputs,
  scriptInputAccepts,
  type ScriptInputKind,
  type ScriptInputValue
} from '@open-pencil/scene-graph/script'

import {
  materializeScriptError,
  materializeScriptOutput,
  type MaterializeScriptResult
} from '@/app/code/script/materialize'
import { evaluateScript, type ScriptEvaluateOptions } from '@/app/code/script/sandbox/evaluate'
import { scriptSeed } from '@/app/code/script/sandbox/random'
import {
  declarationKinds,
  inputValue,
  parseScriptHeader
} from '@/app/code/script/schema-header'
import type { ScriptNodeSpec } from '@/app/code/script/sandbox/spec'

const { script: SCRIPT_FIELD } = OPEN_PENCIL_PLUGIN_DATA

export type ScriptNodeRunResult =
  | ({ ok: true } & MaterializeScriptResult)
  | { ok: false; error: string }

/** The script data a node carries, or `undefined` when it holds none. */
export function readScriptNodeData(graph: SceneGraph, nodeId: string) {
  return readPluginData(graph.getNode(nodeId)?.pluginData, SCRIPT_FIELD)
}

/**
 * Variables a bound input can take: only ones whose value fills the declared kind. The sandbox
 * never sees the document, so resolution happens here, before the run.
 */
export function scriptInputValues(
  graph: SceneGraph,
  nodeId: string,
  kinds: ReadonlyMap<string, ScriptInputKind>
): { values: Record<string, ScriptInputValue>; error?: string } {
  const data = readScriptNodeData(graph, nodeId)
  const values = resolveScriptInputs(data ?? { inputs: {} }, (variableId) =>
    graph.resolveVariableForNode(nodeId, variableId)
  )
  for (const [name, variableId] of Object.entries(data?.bindings ?? {})) {
    const kind = kinds.get(name)
    if (!kind) continue
    const resolved = graph.resolveVariableForNode(nodeId, variableId)
    if (resolved === undefined) {
      return { values, error: `Variable for "${name}" has no value.` }
    }
    if (!scriptInputAccepts(kind, resolved)) {
      return { values, error: `Variable for "${name}" does not match its ${kind} input.` }
    }
  }
  return { values }
}

export interface RunScriptNodeOptions {
  /** The sandbox's frame; tests inject a double, the app leaves it out. */
  evaluate?: (
    source: string,
    options: ScriptEvaluateOptions
  ) => Promise<{ ok: true; roots: unknown[] } | { ok: false; error: string }>
}

/**
 * Run the script on `nodeId` and draw its layers. A failed run draws the error on the node, so
 * the canvas says what went wrong instead of keeping stale layers that look current.
 */
export async function runScriptNode(
  graph: SceneGraph,
  nodeId: string,
  pageId: string,
  options: RunScriptNodeOptions = {}
): Promise<ScriptNodeRunResult> {
  const node = graph.getNode(nodeId)
  if (node?.type !== 'SCRIPT') return { ok: false, error: 'Not a script node.' }
  const data = readScriptNodeData(graph, nodeId)
  if (!data) return { ok: false, error: 'This script node has no code.' }
  // A declared input with no value yet runs at its declared default, so the header alone decides
  // what the first run draws. A bound variable that is gone or of the wrong kind stops the run.
  const declarations = parseScriptHeader(data.source)
  const { values, error } = scriptInputValues(graph, nodeId, declarationKinds(declarations))
  if (error) {
    materializeScriptError(graph, nodeId, error)
    return { ok: false, error }
  }
  const inputs: Record<string, ScriptInputValue> = { ...values }
  for (const declaration of declarations) {
    if (inputs[declaration.name] !== undefined) continue
    const value = inputValue(declaration, undefined)
    if (value !== undefined) inputs[declaration.name] = value
  }
  const evaluate = options.evaluate ?? evaluateScript
  const result = await evaluate(data.source, { inputs, seed: scriptSeed(nodeId, data.source) })
  if (!graph.getNode(nodeId)) return { ok: false, error: 'The script node is gone.' }
  if (!result.ok) {
    materializeScriptError(graph, nodeId, result.error)
    return { ok: false, error: result.error }
  }
  const drawn = materializeScriptOutput(graph, nodeId, result.roots as ScriptNodeSpec[], pageId)
  return { ok: true, ...drawn }
}

/**
 * Whether a node change re-runs its script: a resize (which a script's layers are sized from) or
 * new inputs. A run writes its own output, so it never re-triggers itself.
 */
export function scriptChangeNeedsRun(changes: Partial<SceneNode>): boolean {
  return 'width' in changes || 'height' in changes || 'pluginData' in changes
}

/**
 * Runs a script node's program in the sandbox worker and returns the layers it drew, as plain
 * data. No DOM, so the runner is unit-tested directly; `pencil` is the only way it can reach the
 * document, and every call only describes a layer for the host to materialize.
 */
import * as v from 'valibot'

import type { ScriptInputValue } from '@open-pencil/scene-graph/script'

import { mulberry32 } from '@/app/code/script/sandbox/random'
import {
  scriptNodeSpecSchema,
  type ScriptRunRequest,
  type ScriptRunResult
} from '@/app/code/script/sandbox/schema'
import {
  countScriptNodes,
  SCRIPT_NODE_TYPES,
  type ScriptNodeSpec,
  type ScriptNodeType
} from '@/app/code/script/sandbox/spec'
import { SCRIPT_MAX_NODES } from '@/app/code/script/sandbox/types'

export const SCRIPT_EMPTY_OUTPUT_ERROR = 'Script must return a layer or an array of layers.'
export const SCRIPT_TOO_MANY_NODES_ERROR = `Script output exceeds ${SCRIPT_MAX_NODES} nodes.`
export const SCRIPT_INVALID_OUTPUT_ERROR = 'Script output is not a valid layer.'

const MAX_DEPTH = 100

function refuseType(type: unknown): never {
  throw new Error(
    `Script cannot draw a "${String(type)}" layer; it can draw ${SCRIPT_NODE_TYPES.join(', ')}.`
  )
}

/** The `pencil` global: each call describes one layer, and children nest as the tree they form. */
function createPencil(budget: { nodes: number }, inputs: Record<string, ScriptInputValue>) {
  const node = (type: unknown, props: unknown = {}, children: unknown = []): ScriptNodeSpec => {
    if (typeof type !== 'string' || !(SCRIPT_NODE_TYPES as readonly string[]).includes(type)) {
      refuseType(type)
    }
    budget.nodes += 1
    if (budget.nodes > SCRIPT_MAX_NODES) throw new Error(SCRIPT_TOO_MANY_NODES_ERROR)
    const spec: ScriptNodeSpec = {
      ...(props as Partial<ScriptNodeSpec>),
      type: type as ScriptNodeType
    }
    const drawn = Array.isArray(children) ? children : [children]
    const nested = drawn.filter(
      (child): child is ScriptNodeSpec => child != null && child !== false
    )
    if (nested.length > 0) spec.children = nested
    return spec
  }
  const draw =
    (type: ScriptNodeType) =>
    (props: unknown = {}, children: unknown = []) =>
      node(type, props, children)
  return {
    inputs: { ...inputs },
    node,
    frame: draw('FRAME'),
    rect: draw('RECTANGLE'),
    roundedRect: draw('ROUNDED_RECTANGLE'),
    ellipse: draw('ELLIPSE'),
    text: draw('TEXT'),
    line: draw('LINE')
  }
}

function depthOf(node: ScriptNodeSpec): number {
  let deepest = 1
  for (const child of node.children ?? []) deepest = Math.max(deepest, 1 + depthOf(child))
  return deepest
}

/** Evaluate one script into the layers it drew. */
export function runScript({ id, source, inputs, seed }: ScriptRunRequest): ScriptRunResult {
  try {
    const budget = { nodes: 0 }
    const pencil = createPencil(budget, inputs)
    const random = mulberry32(seed)
    const math = new Proxy(Math, {
      get: (target, key) => (key === 'random' ? random : target[key as keyof Math])
    })
    // eslint-disable-next-line typescript-eslint/no-implied-eval -- the sandbox exists to evaluate this code
    const run = new Function('pencil', 'Math', `"use strict";\n${source}`)
    const value: unknown = run(pencil, math)
    if (value === undefined) throw new Error(SCRIPT_EMPTY_OUTPUT_ERROR)
    const roots = (Array.isArray(value) ? value : [value]).filter(
      (root): root is ScriptNodeSpec => root != null && root !== false
    )
    if (roots.length === 0) throw new Error(SCRIPT_EMPTY_OUTPUT_ERROR)
    for (const root of roots) {
      const parsed = v.safeParse(scriptNodeSpecSchema, root)
      if (!parsed.success) throw new Error(SCRIPT_INVALID_OUTPUT_ERROR)
      if (depthOf(parsed.output) > MAX_DEPTH) throw new Error(SCRIPT_INVALID_OUTPUT_ERROR)
    }
    if (countScriptNodes(roots) > SCRIPT_MAX_NODES) throw new Error(SCRIPT_TOO_MANY_NODES_ERROR)
    return { id, ok: true, roots }
  } catch (error) {
    return { id, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

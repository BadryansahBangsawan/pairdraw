import * as v from 'valibot'

import type { Color } from '../primitives'

/** The longest source a script node keeps, in characters, as Design JSX's own budget. */
export const SCRIPT_MAX_SOURCE_LENGTH = 256_000

/** One declared or chosen input value: text, a number, a switch, or a color. */
export type ScriptInputValue = string | number | boolean | Color

const scriptInputValueSchema: v.GenericSchema<unknown, ScriptInputValue> = v.union([
  v.string(),
  v.pipe(v.number(), v.finite()),
  v.boolean(),
  v.object({
    r: v.number(),
    g: v.number(),
    b: v.number(),
    a: v.number()
  })
])

/**
 * A SCRIPT node's program: the JavaScript it runs in the sandbox and the values its `@input`
 * header's controls hold. The source lives in the document, so the node carries its own code and
 * files are never read from disk.
 */
export const scriptNodeSchema = v.object({
  version: v.literal(1),
  source: v.pipe(v.string(), v.nonEmpty(), v.maxLength(SCRIPT_MAX_SOURCE_LENGTH)),
  inputs: v.optional(v.record(v.string(), scriptInputValueSchema)),
  /** The document variable an input is bound to, by input name; its value then wins. */
  bindings: v.optional(v.record(v.string(), v.pipe(v.string(), v.nonEmpty())))
})

export type ScriptNodeData = v.InferOutput<typeof scriptNodeSchema>

/** The input values a run uses: a bound input's resolved variable, else its stored value. */
export function resolveScriptInputs(
  data: Pick<ScriptNodeData, 'inputs' | 'bindings'>,
  resolve: (variableId: string) => ScriptInputValue | undefined
): Record<string, ScriptInputValue> {
  const values: Record<string, ScriptInputValue> = { ...data.inputs }
  for (const [name, variableId] of Object.entries(data.bindings ?? {})) {
    const resolved = resolve(variableId)
    if (resolved === undefined) continue
    values[name] = resolved
  }
  return values
}

/** Whether a value a variable holds can fill the input control of `kind`. */
export function scriptInputAccepts(kind: ScriptInputKind, value: ScriptInputValue): boolean {
  if (kind === 'number') return typeof value === 'number'
  if (kind === 'string') return typeof value === 'string'
  if (kind === 'boolean') return typeof value === 'boolean'
  if (kind === 'color') return typeof value !== 'object' ? false : 'r' in value
  return false
}

/** The kinds an `@input` line can declare. */
export type ScriptInputKind = 'number' | 'string' | 'boolean' | 'color' | 'enum' | 'ref'

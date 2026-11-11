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
  inputs: v.optional(v.record(v.string(), scriptInputValueSchema))
})

export type ScriptNodeData = v.InferOutput<typeof scriptNodeSchema>

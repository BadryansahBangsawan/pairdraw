/**
 * The messages the host, the script sandbox frame, and its worker exchange. Each side parses what
 * it receives, as a message can come from any frame or script.
 */
import * as v from 'valibot'

import { SCRIPT_NODE_TYPES, type ScriptNodeSpec } from '@/app/code/script/sandbox/spec'

const finiteSchema = v.pipe(v.number(), v.finite())
const sizeSchema = v.pipe(finiteSchema, v.minValue(0))
const hexColorSchema = v.pipe(v.string(), v.regex(/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i))

/** A drawn layer, checked before it is materialized, from either side of the sandbox. */
export const scriptNodeSpecSchema: v.GenericSchema<unknown, ScriptNodeSpec> = v.object({
  type: v.picklist(SCRIPT_NODE_TYPES),
  name: v.optional(v.pipe(v.string(), v.maxLength(200))),
  x: v.optional(finiteSchema),
  y: v.optional(finiteSchema),
  width: v.optional(sizeSchema),
  height: v.optional(sizeSchema),
  fill: v.optional(hexColorSchema),
  stroke: v.optional(hexColorSchema),
  strokeWeight: v.optional(sizeSchema),
  opacity: v.optional(v.pipe(finiteSchema, v.minValue(0), v.maxValue(1))),
  radius: v.optional(sizeSchema),
  text: v.optional(v.pipe(v.string(), v.maxLength(10_000))),
  fontSize: v.optional(v.pipe(finiteSchema, v.minValue(1))),
  fontWeight: v.optional(finiteSchema),
  align: v.optional(v.picklist(['LEFT', 'CENTER', 'RIGHT'])),
  layout: v.optional(v.picklist(['HORIZONTAL', 'VERTICAL'])),
  gap: v.optional(sizeSchema),
  padding: v.optional(sizeSchema),
  children: v.optional(v.pipe(v.array(v.lazy(() => scriptNodeSpecSchema)), v.maxLength(1_000)))
})

export const SCRIPT_SANDBOX_READY = 'open-pencil-script-ready'
export const SCRIPT_SANDBOX_RUN = 'open-pencil-script-run'
export const SCRIPT_SANDBOX_RESULT = 'open-pencil-script-result'

const scriptInputValueSchema = v.union([
  v.string(),
  v.pipe(v.number(), v.finite()),
  v.boolean(),
  v.object({ r: finiteSchema, g: finiteSchema, b: finiteSchema, a: finiteSchema })
])

const runRequestEntries = {
  id: v.string(),
  source: v.string(),
  inputs: v.record(v.string(), scriptInputValueSchema),
  seed: v.pipe(v.number(), v.integer())
}

const resultEntries = {
  succeeded: { id: v.string(), ok: v.literal(true), roots: v.array(v.unknown()) },
  failed: { id: v.string(), ok: v.literal(false), error: v.string() }
}

/** What the host asks the sandbox to run. */
export const scriptRunRequestSchema = v.object(runRequestEntries)
export type ScriptRunRequest = v.InferOutput<typeof scriptRunRequestSchema>

/** What the worker reports for a run. */
export const scriptRunResultSchema = v.variant('ok', [
  v.object(resultEntries.succeeded),
  v.object(resultEntries.failed)
])
export type ScriptRunResult = v.InferOutput<typeof scriptRunResultSchema>

/** A message the host sends the frame. */
export const scriptHostMessageSchema = v.object({
  type: v.literal(SCRIPT_SANDBOX_RUN),
  ...runRequestEntries
})

/** A message the frame sends the host. */
export const scriptFrameMessageSchema = v.variant('type', [
  v.object({ type: v.literal(SCRIPT_SANDBOX_READY) }),
  v.variant('ok', [
    v.object({ type: v.literal(SCRIPT_SANDBOX_RESULT), ...resultEntries.succeeded }),
    v.object({ type: v.literal(SCRIPT_SANDBOX_RESULT), ...resultEntries.failed })
  ])
])

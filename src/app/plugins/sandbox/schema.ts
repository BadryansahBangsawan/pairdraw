/**
 * The messages the plugin host, the sandbox frame, and its worker exchange. A plugin result
 * crosses as JSON text, so the host decides what a value is instead of trusting the frame.
 */
import * as v from 'valibot'

export const PLUGIN_SANDBOX_READY = 'open-pencil-plugin-ready'
export const PLUGIN_SANDBOX_RUN = 'open-pencil-plugin-run'
export const PLUGIN_SANDBOX_RESULT = 'open-pencil-plugin-result'

/** The longest JSON text a plugin result may be; a larger one is refused on both sides. */
export const PLUGIN_RESULT_MAX_CHARS = 64 * 1024

const runRequestEntries = {
  id: v.string(),
  source: v.string()
}

/**
 * A result the worker reports. `result` is the program's return value as JSON text, empty when
 * the program returned nothing.
 */
const runResultEntries = {
  succeeded: {
    id: v.string(),
    ok: v.literal(true),
    result: v.pipe(v.string(), v.maxLength(PLUGIN_RESULT_MAX_CHARS))
  },
  failed: { id: v.string(), ok: v.literal(false), error: v.string() }
}

/** What the host asks the sandbox to run. */
export const pluginRunRequestSchema = v.object(runRequestEntries)
export type PluginRunRequest = v.InferOutput<typeof pluginRunRequestSchema>

/** What the worker reports for a run. */
export const pluginRunResultSchema = v.variant('ok', [
  v.object(runResultEntries.succeeded),
  v.object(runResultEntries.failed)
])
export type PluginRunResult = v.InferOutput<typeof pluginRunResultSchema>

/** A message the host sends the frame. */
export const pluginHostMessageSchema = v.object({
  type: v.literal(PLUGIN_SANDBOX_RUN),
  ...runRequestEntries
})

/** A message the frame sends the host. */
export const pluginFrameMessageSchema = v.variant('type', [
  v.object({ type: v.literal(PLUGIN_SANDBOX_READY) }),
  v.variant('ok', [
    v.object({ type: v.literal(PLUGIN_SANDBOX_RESULT), ...runResultEntries.succeeded }),
    v.object({ type: v.literal(PLUGIN_SANDBOX_RESULT), ...runResultEntries.failed })
  ])
])
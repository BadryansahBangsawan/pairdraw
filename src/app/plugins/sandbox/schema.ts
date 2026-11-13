/**
 * The messages the plugin host, the sandbox frame, and its worker exchange. A plugin result
 * crosses as JSON text, so the host decides what a value is instead of trusting the frame.
 */
import * as v from 'valibot'

export const PLUGIN_SANDBOX_READY = 'open-pencil-plugin-ready'
export const PLUGIN_SANDBOX_RUN = 'open-pencil-plugin-run'
export const PLUGIN_SANDBOX_RESULT = 'open-pencil-plugin-result'
export const PLUGIN_SANDBOX_CALL = 'open-pencil-plugin-call'
export const PLUGIN_SANDBOX_CALL_RESULT = 'open-pencil-plugin-call-result'

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

/**
 * A host call a plugin made: the tool it asks for and its arguments. The frame relays it to the
 * host, which decides whether the plugin may call that tool.
 */
export const pluginCallRequestSchema = v.object({
  type: v.literal(PLUGIN_SANDBOX_CALL),
  callId: v.string(),
  name: v.string(),
  args: v.unknown()
})
export type PluginCallRequest = v.InferOutput<typeof pluginCallRequestSchema>

/**
 * What the host answers a call with. A result crosses as JSON text, like a run's, so the plugin
 * reads a value the host produced; a failed call carries the reason instead.
 */
export const pluginCallResultSchema = v.variant('ok', [
  v.object({
    type: v.literal(PLUGIN_SANDBOX_CALL_RESULT),
    callId: v.string(),
    ok: v.literal(true),
    result: v.pipe(v.string(), v.maxLength(PLUGIN_RESULT_MAX_CHARS))
  }),
  v.object({
    type: v.literal(PLUGIN_SANDBOX_CALL_RESULT),
    callId: v.string(),
    ok: v.literal(false),
    error: v.string()
  })
])
export type PluginCallResult = v.InferOutput<typeof pluginCallResultSchema>

/** A message the host sends the frame: a run to start, or the answer to a call it made. */
export const pluginHostMessageSchema = v.variant('type', [
  v.object({ type: v.literal(PLUGIN_SANDBOX_RUN), ...runRequestEntries }),
  pluginCallResultSchema
])

/** A message the frame sends the host: readiness, a result, or a call the host must answer. */
export const pluginFrameMessageSchema = v.variant('type', [
  v.object({ type: v.literal(PLUGIN_SANDBOX_READY) }),
  v.variant('ok', [
    v.object({ type: v.literal(PLUGIN_SANDBOX_RESULT), ...runResultEntries.succeeded }),
    v.object({ type: v.literal(PLUGIN_SANDBOX_RESULT), ...runResultEntries.failed })
  ]),
  pluginCallRequestSchema
])

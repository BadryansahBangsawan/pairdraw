/**
 * The host side of the plugin sandbox: one installed plugin's source goes to a fresh opaque-origin
 * frame, which runs it in a fresh worker under the same deadline and blocked network as a script
 * node, and the frame is torn down on every path. Calls the plugin makes reach the document only
 * through the host, which checks each against the plugin's grants and closes one undo step.
 */
import * as v from 'valibot'

import { IS_BROWSER } from '@open-pencil/core/constants'

import type { EditorStore } from '@/app/editor/session/create'
import {
  PLUGIN_CALL_UNAVAILABLE_MESSAGE,
  PLUGIN_DISABLED_MESSAGE,
  pluginRunMissingMessage
} from '@/app/plugins/messages'
import { releasePluginPointer } from '@/app/plugins/pointer'
import { createPluginHost, type PluginHost } from '@/app/plugins/sandbox/host'
import {
  PLUGIN_SANDBOX_CALL,
  PLUGIN_SANDBOX_CALL_RESULT,
  PLUGIN_POINTER_CALL,
  PLUGIN_SANDBOX_READY,
  PLUGIN_SANDBOX_RUN,
  pluginFrameMessageSchema,
  pluginRunResultSchema
} from '@/app/plugins/sandbox/schema'
import { PLUGIN_RUN_READY_TIMEOUT_MS, PLUGIN_RUN_TIMEOUT_MS } from '@/app/plugins/sandbox/types'
import type { InstalledPlugin } from '@/app/plugins/schema'
import {
  runInSandboxFrame,
  type SandboxDeadline,
  type SandboxFrame,
  type SandboxFrameFactory
} from '@/app/runtime/sandbox-frame'

/** What a plugin run produced: the value the plugin returned, already parsed, or an error. */
export type PluginRunOutcome = { ok: true; result: unknown } | { ok: false; error: string }

export interface PluginRunOptions {
  timeoutMs?: number
  readyTimeoutMs?: number
  /** The frame to run in; the app's iframe when missing. */
  frame?: SandboxFrameFactory
  /** The document the plugin's calls reach; without it every call it makes fails. */
  store?: EditorStore
}

function parseResultText(text: string): unknown {
  return text === '' ? undefined : v.parse(v.pipe(v.string(), v.parseJson(), v.unknown()), text)
}

/** Run one plugin source in a fresh frame, with the host's deadline and its tool calls. */
export function runPluginInFrame(
  frame: SandboxFrame,
  source: string,
  options: { timeoutMs?: number; readyTimeoutMs?: number; host?: PluginHost | null } = {}
): Promise<PluginRunOutcome> {
  const request = { id: crypto.randomUUID(), source }
  const host = options.host ?? null
  // The user can hold the pointer for longer than a run may compute, so that wait is not timed.
  let deadline: SandboxDeadline | null = null
  return runInSandboxFrame<PluginRunOutcome>(frame, {
    request: { type: PLUGIN_SANDBOX_RUN, ...request },
    ready(data, runDeadline) {
      deadline = runDeadline
      const parsed = v.safeParse(pluginFrameMessageSchema, data)
      return parsed.success && parsed.output.type === PLUGIN_SANDBOX_READY
    },
    // A plugin's call is answered by the host, which checks it and performs it; the run goes on.
    handle(data, reply) {
      const parsed = v.safeParse(pluginFrameMessageSchema, data)
      if (!parsed.success || parsed.output.type !== PLUGIN_SANDBOX_CALL) return false
      const call = parsed.output
      const answer = (
        result:
          | { callId: string; ok: true; result: string }
          | { callId: string; ok: false; error: string }
      ) => reply({ type: PLUGIN_SANDBOX_CALL_RESULT, ...result })
      if (!host) {
        answer({ callId: call.callId, ok: false, error: PLUGIN_CALL_UNAVAILABLE_MESSAGE })
        return true
      }
      const waiting = call.name === PLUGIN_POINTER_CALL
      if (waiting) deadline?.pause()
      void (async () => {
        try {
          const result = await host.call(call.name, call.args)
          // A result that cannot cross as JSON text is a failed call, not a silent `undefined`.
          let text: string
          try {
            const serialized: unknown = JSON.stringify(result)
            text = typeof serialized === 'string' ? serialized : ''
          } catch {
            answer({
              callId: call.callId,
              ok: false,
              error: 'This call returned an invalid result.'
            })
            return
          }
          answer({ callId: call.callId, ok: true, result: text })
        } catch (error) {
          answer({
            callId: call.callId,
            ok: false,
            error: error instanceof Error ? error.message : String(error)
          })
        } finally {
          if (waiting) deadline?.resume()
        }
      })()
      return true
    },
    read(data) {
      const parsed = v.safeParse(pluginRunResultSchema, data)
      if (!parsed.success) return null
      const message = parsed.output
      if (message.id !== request.id) return null
      if (!message.ok) return { ok: false, error: message.error }
      try {
        return { ok: true, result: parseResultText(message.result) }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
    timeoutMs: options.timeoutMs ?? PLUGIN_RUN_TIMEOUT_MS,
    readyTimeoutMs: options.readyTimeoutMs ?? PLUGIN_RUN_READY_TIMEOUT_MS,
    timeoutResult: { ok: false, error: 'Plugin timed out.' },
    readyTimeoutResult: { ok: false, error: 'Plugin sandbox did not become ready.' }
  })
}

/**
 * Run one installed plugin by id. A missing or disabled plugin runs nothing, and the frame module
 * loads here rather than at import time, so this module stays usable outside a browser. The host
 * closes the run's one undo step whether the plugin returned or failed.
 */
export async function runInstalledPlugin(
  plugins: readonly InstalledPlugin[],
  id: string,
  options: PluginRunOptions = {}
): Promise<PluginRunOutcome> {
  const plugin = plugins.find((item) => item.id === id)
  if (!plugin) return { ok: false, error: pluginRunMissingMessage(id) }
  if (!plugin.enabled) return { ok: false, error: PLUGIN_DISABLED_MESSAGE }
  if (!IS_BROWSER) return { ok: false, error: 'Plugins require a browser.' }
  const host = options.store ? createPluginHost(options.store, plugins, id) : null
  let failed = true
  try {
    const frame = options.frame
      ? options.frame()
      : await import('@/app/plugins/sandbox/iframe').then(({ createPluginFrame }) =>
          createPluginFrame()
        )
    const outcome = await runPluginInFrame(frame, plugin.source, { ...options, host })
    failed = !outcome.ok
    return outcome
  } finally {
    // A run that ends while it waits for the pointer gives the canvas back.
    releasePluginPointer(id)
    host?.finish(failed)
  }
}

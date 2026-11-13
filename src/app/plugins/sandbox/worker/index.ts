/**
 * The plugin worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it runs
 * reaches no network: the worker's own globals for it are replaced before the first run. A tool
 * call it makes goes to the frame, which relays it to the host and brings back the answer.
 */
import * as v from 'valibot'

import {
  PLUGIN_SANDBOX_CALL,
  PLUGIN_SANDBOX_CALL_RESULT,
  pluginCallResultSchema,
  type PluginCallRequest,
  type PluginRunRequest
} from '@/app/plugins/sandbox/schema'

import { blockPluginNetwork } from '../network'
import { runPluginProgram } from './run'

blockPluginNetwork(self)

let nextCallId = 1
const pending = new Map<
  string,
  { resolve: (value: unknown) => void; reject: (error: Error) => void }
>()

function callHost(name: string, args: unknown): Promise<unknown> {
  const callId = String(nextCallId++)
  const request: PluginCallRequest = { type: PLUGIN_SANDBOX_CALL, callId, name, args }
  self.postMessage(request)
  return new Promise((resolve, reject) => {
    pending.set(callId, { resolve, reject })
  })
}

function answer(data: unknown): void {
  const parsed = v.safeParse(pluginCallResultSchema, data)
  if (!parsed.success) return
  const waiting = pending.get(parsed.output.callId)
  if (!waiting) return
  pending.delete(parsed.output.callId)
  if (parsed.output.ok) {
    try {
      waiting.resolve(parsed.output.result === '' ? undefined : JSON.parse(parsed.output.result))
    } catch {
      waiting.reject(new Error('The tool returned a result that is not valid.'))
    }
    return
  }
  waiting.reject(new Error(parsed.output.error))
}

self.onmessage = (event: MessageEvent<unknown>) => {
  const data = event.data as { type?: unknown } | null
  if (data?.type === PLUGIN_SANDBOX_CALL_RESULT) return answer(data)
  void runPluginProgram(event.data as PluginRunRequest, callHost).then((result) =>
    self.postMessage(result)
  )
}

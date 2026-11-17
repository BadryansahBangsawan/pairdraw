/**
 * The plugin sandbox frame: runs each request from the host in a fresh worker and reports what the
 * plugin returned. The frame has an opaque origin, so it starts the worker from its bundled source
 * rather than a URL of the app. A tool call a plugin makes is relayed to the host, which decides
 * whether the plugin may make it, and the answer is relayed back to the worker.
 */
import * as v from 'valibot'

import {
  PLUGIN_SANDBOX_CALL_RESULT,
  PLUGIN_SANDBOX_READY,
  PLUGIN_SANDBOX_RESULT,
  pluginCallRequestSchema,
  pluginRunResultSchema,
  type PluginRunResult
} from '@/app/plugins/sandbox/schema'

import { readPluginHostMessage } from './parent-message'
import workerSource from './worker/index.ts?script'

const workerURL = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))

let worker: Worker | undefined

function report(result: PluginRunResult): void {
  parent.postMessage({ type: PLUGIN_SANDBOX_RESULT, ...result }, '*')
  worker?.terminate()
  worker = undefined
}

function start(id: string, source: string): void {
  worker?.terminate()
  const started = new Worker(workerURL)
  worker = started
  const failed = (): PluginRunResult => ({ id, ok: false, error: 'Plugin execution failed.' })
  started.onmessage = ({ data }: MessageEvent<unknown>) => {
    const result = v.safeParse(pluginRunResultSchema, data)
    if (result.success) return report(result.output)
    // A call the plugin made: the host answers, and the answer goes back to the worker.
    const call = v.safeParse(pluginCallRequestSchema, data)
    if (call.success) parent.postMessage(call.output, '*')
  }
  started.onerror = () => report(failed())
  started.postMessage({ id, source })
}

addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = readPluginHostMessage(event.data, event.source, parent)
  if (!message) return
  // The host's answer to a call the plugin made, for the worker that made it.
  if (message.type === PLUGIN_SANDBOX_CALL_RESULT) {
    worker?.postMessage(message)
    return
  }
  start(message.id, message.source)
})
parent.postMessage({ type: PLUGIN_SANDBOX_READY }, '*')

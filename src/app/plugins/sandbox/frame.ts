/**
 * The plugin sandbox frame: runs each request from the host in a fresh worker and reports what the
 * plugin returned. The frame has an opaque origin, so it starts the worker from its bundled source
 * rather than a URL of the app.
 */
import * as v from 'valibot'

import {
  PLUGIN_SANDBOX_READY,
  PLUGIN_SANDBOX_RESULT,
  pluginHostMessageSchema,
  pluginRunResultSchema,
  type PluginRunResult
} from '@/app/plugins/sandbox/schema'

import workerSource from './worker/index.ts?script'

const workerURL = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))

addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = v.safeParse(pluginHostMessageSchema, event.data)
  if (!message.success) return
  const { type: _type, ...request } = message.output
  const worker = new Worker(workerURL)
  const report = (result: PluginRunResult) => {
    parent.postMessage({ type: PLUGIN_SANDBOX_RESULT, ...result }, '*')
    worker.terminate()
  }
  const failed = (): PluginRunResult => ({
    id: request.id,
    ok: false,
    error: 'Plugin execution failed.'
  })
  worker.onmessage = ({ data }: MessageEvent<unknown>) => {
    const result = v.safeParse(pluginRunResultSchema, data)
    report(result.success ? result.output : failed())
  }
  worker.onerror = () => report(failed())
  worker.postMessage(request)
})
parent.postMessage({ type: PLUGIN_SANDBOX_READY }, '*')
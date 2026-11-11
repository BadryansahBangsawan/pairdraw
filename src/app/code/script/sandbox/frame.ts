/**
 * The script sandbox frame (`document.ts`): runs each request from the host in a fresh worker and
 * reports the layers it drew. The frame has an opaque origin, so it starts the worker from its
 * bundled source rather than a URL of the app.
 */
import * as v from 'valibot'

import {
  SCRIPT_SANDBOX_READY,
  SCRIPT_SANDBOX_RESULT,
  scriptHostMessageSchema,
  scriptRunResultSchema,
  type ScriptRunResult
} from '@/app/code/script/sandbox/schema'

import workerSource from './worker/index.ts?script'

const workerURL = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }))

addEventListener('message', (event: MessageEvent<unknown>) => {
  const message = v.safeParse(scriptHostMessageSchema, event.data)
  if (!message.success) return
  const { type: _type, ...request } = message.output
  const worker = new Worker(workerURL)
  const report = (result: ScriptRunResult) => {
    parent.postMessage({ type: SCRIPT_SANDBOX_RESULT, ...result }, '*')
    worker.terminate()
  }
  const failed = (): ScriptRunResult => ({
    id: request.id,
    ok: false,
    error: 'Script execution failed.'
  })
  worker.onmessage = ({ data }: MessageEvent<unknown>) => {
    const result = v.safeParse(scriptRunResultSchema, data)
    report(result.success ? result.output : failed())
  }
  worker.onerror = () => report(failed())
  worker.postMessage(request)
})
parent.postMessage({ type: SCRIPT_SANDBOX_READY }, '*')

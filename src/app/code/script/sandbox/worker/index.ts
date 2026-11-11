/**
 * The script worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it runs
 * reaches no network: the worker's own globals for it are replaced before the first run.
 */
import type { ScriptRunRequest } from '@/app/code/script/sandbox/schema'

import { runScript } from './run'

const blocked = () => {
  throw new Error('Network access is unavailable in scripts.')
}
Object.defineProperties(self, {
  fetch: { value: blocked },
  XMLHttpRequest: { value: undefined },
  WebSocket: { value: undefined },
  EventSource: { value: undefined },
  importScripts: { value: blocked }
})

self.onmessage = (event: MessageEvent<ScriptRunRequest>) => {
  self.postMessage(runScript(event.data))
}

/**
 * The script worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it runs
 * reaches no network: the worker's own globals for it are replaced before the first run.
 */
import { blockSandboxNetwork } from '@/app/code/sandbox/network'
import type { ScriptRunRequest } from '@/app/code/script/sandbox/schema'

import { runScript } from './run'

blockSandboxNetwork(self, 'Network access is unavailable in scripts.')

self.onmessage = (event: MessageEvent<ScriptRunRequest>) => {
  self.postMessage(runScript(event.data))
}

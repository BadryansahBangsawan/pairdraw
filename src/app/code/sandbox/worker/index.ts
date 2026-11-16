/**
 * The sandbox worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it
 * runs reaches no network: the worker's own globals for it are replaced before the first run.
 */
import { blockSandboxNetwork } from '@/app/code/sandbox/network'
import type { SandboxRunRequest } from '@/app/code/sandbox/schema'

import { runDesignJSX } from './run'

blockSandboxNetwork(self, 'Network access is unavailable in Design JSX.')

self.onmessage = (event: MessageEvent<SandboxRunRequest>) => {
  self.postMessage(runDesignJSX(event.data))
}

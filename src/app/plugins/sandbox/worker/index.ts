/**
 * The plugin worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it runs
 * reaches no network: the worker's own globals for it are replaced before the first run.
 */
import type { PluginRunRequest } from '@/app/plugins/sandbox/schema'

import { blockPluginNetwork } from '../network'
import { runPluginProgram } from './run'

blockPluginNetwork(self)

self.onmessage = (event: MessageEvent<PluginRunRequest>) => {
  self.postMessage(runPluginProgram(event.data))
}
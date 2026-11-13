/**
 * The frame the app runs plugins in: the same opaque-origin sandbox as a script node, running the
 * plugin frame script. It is loaded on demand, so the pure host in `evaluate.ts` stays importable
 * outside a browser.
 */
import frameScript from '@/app/plugins/sandbox/frame.ts?script'
import { createIframeFrame } from '@/app/runtime/sandbox-iframe'
import type { SandboxFrame } from '@/app/runtime/sandbox-frame'

export function createPluginFrame(): SandboxFrame {
  return createIframeFrame(frameScript)
}

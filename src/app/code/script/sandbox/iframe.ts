/**
 * The frame the app runs scripts in: an iframe with an opaque origin under the sandbox CSP. It is
 * loaded on demand, so the pure host in `evaluate.ts` stays importable outside a browser.
 */
import frameScript from '@/app/code/script/sandbox/frame.ts?script'
import type { ScriptFrame } from '@/app/code/script/sandbox/evaluate'
import { createIframeFrame as createSandboxFrame } from '@/app/runtime/sandbox-iframe'

export function createIframeFrame(): ScriptFrame {
  return createSandboxFrame(frameScript)
}
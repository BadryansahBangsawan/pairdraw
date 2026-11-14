/**
 * The host side of the script sandbox: hands one script to a fresh opaque-origin frame, which runs
 * it in a fresh worker, and checks the layers that come back. The frame is torn down on every
 * path, so a script that hangs or floods the channel costs one frame and nothing else.
 */
import * as v from 'valibot'

import { IS_BROWSER } from '@pairdraw/core/constants'
import type { ScriptInputValue } from '@pairdraw/scene-graph/script'

import {
  SCRIPT_SANDBOX_READY,
  SCRIPT_SANDBOX_RUN,
  scriptFrameMessageSchema,
  scriptNodeSpecSchema
} from '@/app/code/script/sandbox/schema'
import { countScriptNodes, type ScriptNodeSpec } from '@/app/code/script/sandbox/spec'
import {
  SCRIPT_DEFAULT_READY_TIMEOUT_MS,
  SCRIPT_DEFAULT_TIMEOUT_MS,
  SCRIPT_MAX_NODES,
  type ScriptSandboxResult
} from '@/app/code/script/sandbox/types'
import {
  runInSandboxFrame,
  type SandboxFrame,
  type SandboxFrameFactory
} from '@/app/runtime/sandbox-frame'

/** One sandbox frame, as the host drives it; the app supplies the iframe, a test a double. */
export type ScriptFrame = SandboxFrame

/** The frame to run in; the app's iframe when missing. */
export type ScriptFrameFactory = SandboxFrameFactory

export interface ScriptEvaluateOptions {
  inputs?: Record<string, ScriptInputValue>
  /** Seeds `Math.random`; see `scriptSeed`. */
  seed?: number
  timeoutMs?: number
  readyTimeoutMs?: number
}

function checkRoots(value: unknown): ScriptNodeSpec[] {
  if (!Array.isArray(value)) throw new Error('Script output is not a valid layer.')
  const roots: ScriptNodeSpec[] = []
  for (const root of value) {
    const parsed = v.safeParse(scriptNodeSpecSchema, root)
    if (!parsed.success) throw new Error('Script output is not a valid layer.')
    roots.push(parsed.output)
  }
  if (countScriptNodes(roots) > SCRIPT_MAX_NODES) {
    throw new Error(`Script output exceeds ${SCRIPT_MAX_NODES} nodes.`)
  }
  return roots
}

/** Evaluate one script in a fresh frame, with the host's deadline and output checks. */
export function runInFrame(
  frame: ScriptFrame,
  source: string,
  options: ScriptEvaluateOptions = {}
): Promise<ScriptSandboxResult> {
  const request = {
    id: crypto.randomUUID(),
    source,
    inputs: options.inputs ?? {},
    seed: options.seed ?? 0
  }
  return runInSandboxFrame<ScriptSandboxResult>(frame, {
    request: { type: SCRIPT_SANDBOX_RUN, ...request },
    ready(data) {
      const parsed = v.safeParse(scriptFrameMessageSchema, data)
      return parsed.success && parsed.output.type === SCRIPT_SANDBOX_READY
    },
    read(data) {
      const parsed = v.safeParse(scriptFrameMessageSchema, data)
      if (!parsed.success || parsed.output.type === SCRIPT_SANDBOX_READY) return null
      const message = parsed.output
      if (message.id !== request.id) return null
      if (!message.ok) return { ok: false, error: message.error }
      try {
        return { ok: true, roots: checkRoots(message.roots) }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
    timeoutMs: options.timeoutMs ?? SCRIPT_DEFAULT_TIMEOUT_MS,
    readyTimeoutMs: options.readyTimeoutMs ?? SCRIPT_DEFAULT_READY_TIMEOUT_MS,
    timeoutResult: { ok: false, error: 'Script timed out.' },
    readyTimeoutResult: { ok: false, error: 'Script sandbox did not become ready.' }
  })
}

/**
 * Run one script in a fresh sandbox frame. The iframe module (which imports the bundled frame
 * script) loads here rather than at import time, so this module stays usable outside a browser.
 */
export async function evaluateScript(
  source: string,
  options: ScriptEvaluateOptions = {}
): Promise<ScriptSandboxResult> {
  if (!IS_BROWSER) return { ok: false, error: 'Script execution requires a browser.' }
  const { createIframeFrame } = await import('@/app/code/script/sandbox/iframe')
  return runInFrame(createIframeFrame(), source, options)
}

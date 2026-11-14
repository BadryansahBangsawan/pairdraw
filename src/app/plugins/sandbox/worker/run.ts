/**
 * Runs one plugin's program in the sandbox worker and returns what it returned, as JSON text.
 * No DOM, so the runner is unit-tested directly; `plugin` is the only way it can reach the
 * document, and its one method asks the host, which decides whether the plugin may run the tool.
 */
import type { PluginPointerPoint } from '@/app/plugins/pointer'

import {
  PLUGIN_POINTER_CALL,
  PLUGIN_RESULT_MAX_CHARS,
  type PluginRunRequest,
  type PluginRunResult
} from '../schema'

export const PLUGIN_RESULT_INVALID_ERROR = 'Plugin result is not valid.'
const PLUGIN_CALL_UNAVAILABLE_ERROR = 'This plugin cannot call tools.'

/** What a program's `plugin.call` reaches: the host, which answers with the tool's result. */
export type PluginToolCall = (name: string, args: unknown) => Promise<unknown>

// `new Function` returns a value but cannot await; a plugin program may, so it runs as an async
// function instead.
const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (
  ...args: string[]
) => (...values: unknown[]) => Promise<unknown>

/**
 * The global a plugin is handed: the host's tools, and the canvas pointer. `pointer` resolves with
 * the sequence's points in order once the user releases, or `null` when it was cancelled.
 */
function createPluginAPI(call: PluginToolCall): Readonly<{
  call: PluginToolCall
  /** The next pointer sequence in document coordinates, or `null` when the user cancelled it. */
  pointer: () => Promise<PluginPointerPoint[] | null>
}> {
  return Object.freeze({
    call,
    pointer: () => call(PLUGIN_POINTER_CALL, {}) as Promise<PluginPointerPoint[] | null>
  })
}

/** Serialize a program's return value, or throw when it cannot cross as JSON text. */
function pluginResultText(value: unknown): string {
  if (value === undefined) return ''
  let text: string | undefined
  try {
    text = JSON.stringify(value)
  } catch {
    throw new Error(PLUGIN_RESULT_INVALID_ERROR)
  }
  if (typeof text !== 'string') throw new Error(PLUGIN_RESULT_INVALID_ERROR)
  if (text.length > PLUGIN_RESULT_MAX_CHARS) throw new Error(PLUGIN_RESULT_INVALID_ERROR)
  return text
}

/**
 * Evaluate one plugin program into the text of what it returned. A program with no host still
 * gets the API, so failing at its first call is the program's own error rather than a missing
 * global.
 */
export async function runPluginProgram(
  { id, source }: PluginRunRequest,
  call: PluginToolCall = () => Promise.reject(new Error(PLUGIN_CALL_UNAVAILABLE_ERROR))
): Promise<PluginRunResult> {
  try {
    // eslint-disable-next-line typescript-eslint/no-implied-eval -- the sandbox exists to evaluate this code
    const run = new AsyncFunction('plugin', `"use strict";\n${source}`)
    const value: unknown = await run(createPluginAPI(call))
    return { id, ok: true, result: pluginResultText(value) }
  } catch (error) {
    return { id, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Runs one plugin's program in the sandbox worker and returns what it returned, as JSON text.
 * No DOM, so the runner is unit-tested directly; `plugin` is the only way it can reach the
 * document, and this version gives it no methods at all.
 */
import { PLUGIN_RESULT_MAX_CHARS, type PluginRunRequest, type PluginRunResult } from '../schema'

export const PLUGIN_RESULT_INVALID_ERROR = 'Plugin result is not valid.'

/** The global a plugin is handed: empty until this version's host API exists. */
export function createPluginAPI(): Readonly<Record<string, never>> {
  return Object.freeze({})
}

/** Serialize a program's return value, or throw when it cannot cross as JSON text. */
export function pluginResultText(value: unknown): string {
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

/** Evaluate one plugin program into the text of what it returned. */
export function runPluginProgram({ id, source }: PluginRunRequest): PluginRunResult {
  try {
    // eslint-disable-next-line typescript-eslint/no-implied-eval -- the sandbox exists to evaluate this code
    const run = new Function('plugin', `"use strict";\n${source}`)
    const value: unknown = run(createPluginAPI())
    return { id, ok: true, result: pluginResultText(value) }
  } catch (error) {
    return { id, ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
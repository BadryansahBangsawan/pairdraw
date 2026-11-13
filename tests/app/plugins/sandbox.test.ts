import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { installPlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { blockPluginNetwork, PLUGIN_NETWORK_UNAVAILABLE_ERROR } from '@/app/plugins/sandbox/network'
import { runInstalledPlugin, runPluginInFrame } from '@/app/plugins/sandbox/evaluate'
import {
  PLUGIN_SANDBOX_READY,
  PLUGIN_SANDBOX_RESULT,
  PLUGIN_SANDBOX_RUN,
  PLUGIN_RESULT_MAX_CHARS,
  pluginFrameMessageSchema,
  pluginHostMessageSchema,
  pluginRunRequestSchema,
  pluginRunResultSchema
} from '@/app/plugins/sandbox/schema'
import {
  PLUGIN_RESULT_INVALID_ERROR,
  runPluginProgram
} from '@/app/plugins/sandbox/worker/run'
import type { SandboxFrame } from '@/app/runtime/sandbox-frame'

function parse<T>(schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>): (input: unknown) => unknown {
  return (input) => v.parse(schema, input)
}

const request = (source: string) => ({ id: 'run-1', source })

/** A frame that answers with whatever the callback returns, and records what it was sent. */
function frameDouble(answer: (source: string, id: string) => unknown) {
  const sent: unknown[] = []
  let handler: ((data: unknown) => void) | undefined
  let disposals = 0
  const frame: SandboxFrame = {
    postMessage(message) {
      sent.push(message)
      const { id, source } = message as { id: string; source: string }
      const answerMessage = answer(source, id)
      if (answerMessage === undefined) return
      queueMicrotask(() => handler?.(answerMessage))
    },
    listen(callback) {
      handler = callback
      queueMicrotask(() => callback({ type: PLUGIN_SANDBOX_READY }))
      return () => undefined
    },
    dispose() {
      disposals += 1
    }
  }
  return { frame, sent, disposals: () => disposals }
}

describe('plugin sandbox messages', () => {
  test('accepts a well-formed run request and refuses one that is not', () => {
    expect(parse(pluginRunRequestSchema)({ id: 'a', source: 'return 1' })).toEqual({
      id: 'a',
      source: 'return 1'
    })
    expect(() => parse(pluginRunRequestSchema)({ id: 'a' })).toThrow()
    expect(() => parse(pluginHostMessageSchema)({ type: PLUGIN_SANDBOX_READY })).toThrow()
    expect(parse(pluginHostMessageSchema)({ type: PLUGIN_SANDBOX_RUN, id: 'a', source: '' })).toEqual(
      { type: PLUGIN_SANDBOX_RUN, id: 'a', source: '' }
    )
  })

  test('accepts both plugin results and refuses a payload that is not JSON text', () => {
    const succeeded = { type: PLUGIN_SANDBOX_RESULT, id: 'a', ok: true as const, result: '{"n":1}' }
    const failed = { type: PLUGIN_SANDBOX_RESULT, id: 'a', ok: false as const, error: 'no' }
    expect(parse(pluginFrameMessageSchema)(succeeded)).toEqual(succeeded)
    expect(parse(pluginFrameMessageSchema)(failed)).toEqual(failed)
    expect(
      parse(pluginRunResultSchema)({ id: 'a', ok: true, result: 'x'.repeat(PLUGIN_RESULT_MAX_CHARS) })
    ).toMatchObject({ ok: true })
    expect(() =>
      parse(pluginRunResultSchema)({
        id: 'a',
        ok: true,
        result: 'x'.repeat(PLUGIN_RESULT_MAX_CHARS + 1)
      })
    ).toThrow()
    expect(() => parse(pluginFrameMessageSchema)({ ...succeeded, roots: [{}] })).not.toThrow()
    expect(() => parse(pluginRunResultSchema)({ id: 'a', ok: 'yes' })).toThrow()
  })
})

describe('plugin worker', () => {
  test('returns what the program returned as JSON text', () => {
    const result = runPluginProgram(request('return { marks: [1, 2, 3] }'))
    if (!result.ok) throw new Error(result.error)
    expect(JSON.parse(result.result)).toEqual({ marks: [1, 2, 3] })
  })

  test('a program that returns nothing succeeds with no result text', () => {
    expect(runPluginProgram(request('const unused = 1'))).toMatchObject({ ok: true, result: '' })
  })

  test('hands the program an empty, frozen API', () => {
    expect(
      runPluginProgram(
        request(`
        const keys = Object.keys(plugin)
        const sealed = Object.isFrozen(plugin)
        return { keys, sealed }
      `)
      )
    ).toMatchObject({ ok: true, result: '{"keys":[],"sealed":true}' })
  })

  test('reports a thrown error and a value that cannot cross as JSON text', () => {
    expect(runPluginProgram(request('throw new Error("no marks")'))).toEqual({
      id: 'run-1',
      ok: false,
      error: 'no marks'
    })
    const circular = runPluginProgram(request('const a = {}; a.self = a; return a'))
    expect(circular).toEqual({ id: 'run-1', ok: false, error: PLUGIN_RESULT_INVALID_ERROR })
    const huge = runPluginProgram(request(`return "x".repeat(${PLUGIN_RESULT_MAX_CHARS + 1})`))
    expect(huge).toEqual({ id: 'run-1', ok: false, error: PLUGIN_RESULT_INVALID_ERROR })
  })

  test('reaches no network even when the program names it', () => {
    const scope: Record<string, unknown> = { fetch: () => 'reachable' }
    blockPluginNetwork(scope)
    expect(() => (scope.fetch as () => unknown)()).toThrow(PLUGIN_NETWORK_UNAVAILABLE_ERROR)
    expect(scope.XMLHttpRequest).toBeUndefined()
    expect(scope.WebSocket).toBeUndefined()
    expect(scope.EventSource).toBeUndefined()
    expect(() => (scope.importScripts as () => unknown)()).toThrow(PLUGIN_NETWORK_UNAVAILABLE_ERROR)
  })
})

describe('plugin run session', () => {
  test('posts the source on ready and returns the parsed result under the run id', async () => {
    const { frame, sent, disposals } = frameDouble((source, id) => ({
      type: PLUGIN_SANDBOX_RESULT,
      id,
      ok: true,
      result: JSON.stringify({ source })
    }))
    expect(await runPluginInFrame(frame, 'return { a: 1 }')).toEqual({
      ok: true,
      result: { source: 'return { a: 1 }' }
    })
    expect(sent).toMatchObject([{ type: PLUGIN_SANDBOX_RUN, source: 'return { a: 1 }' }])
    expect(disposals()).toBe(1)
  })

  test('ignores an answer addressed to another run', async () => {
    const { frame } = frameDouble(() => ({
      type: PLUGIN_SANDBOX_RESULT,
      id: 'another-run',
      ok: true,
      result: '1'
    }))
    expect(await runPluginInFrame(frame, 'return 1', { timeoutMs: 20 })).toEqual({
      ok: false,
      error: 'Plugin timed out.'
    })
  })

  test('a result that fails the schema is dropped, and the deadline ends the run', async () => {
    const { frame, disposals } = frameDouble((_source, id) => ({
      type: PLUGIN_SANDBOX_RESULT,
      id,
      ok: true,
      result: 42
    }))
    const started = Date.now()
    expect(await runPluginInFrame(frame, 'return 1', { timeoutMs: 30 })).toEqual({
      ok: false,
      error: 'Plugin timed out.'
    })
    expect(Date.now() - started).toBeGreaterThanOrEqual(25)
    expect(disposals()).toBe(1)
  })

  test('an endless loop ends in the host error, and a later run still works', async () => {
    const looping = frameDouble(() => undefined)
    expect(
      await runPluginInFrame(looping.frame, 'while (true) {}', { timeoutMs: 20 })
    ).toEqual({ ok: false, error: 'Plugin timed out.' })
    expect(looping.disposals()).toBe(1)
    const later = frameDouble((_source, id) => ({
      type: PLUGIN_SANDBOX_RESULT,
      id,
      ok: false,
      error: 'no marks'
    }))
    expect(await runPluginInFrame(later.frame, 'throw new Error("no marks")', { timeoutMs: 20 })).toEqual(
      { ok: false, error: 'no marks' }
    )
  })

  test('gives up when the frame never becomes ready', async () => {
    const frame: SandboxFrame = {
      postMessage: () => undefined,
      listen: () => () => undefined,
      dispose: () => undefined
    }
    expect(
      await runPluginInFrame(frame, 'return 1', { timeoutMs: 20, readyTimeoutMs: 20 })
    ).toEqual({ ok: false, error: 'Plugin sandbox did not become ready.' })
  })

  test('a disabled plugin and an unknown id run nothing', async () => {
    const installed = installPlugin(
      [],
      JSON.stringify({
        id: 'marks',
        name: 'Marks',
        version: '1.0.0',
        source: 'return 1',
        command: 'Mark',
        capabilities: ['document:read']
      })
    )
    if (!installed.ok) throw new Error('install refused')
    let frames = 0
    const frame = () => {
      frames += 1
      return frameDouble(() => undefined).frame
    }
    const unknown = await runInstalledPlugin(installed.plugins, 'other', { frame })
    expect(unknown).toMatchObject({ ok: false })
    expect(frames).toBe(0)
    const disabled = setPluginEnabled(installed.plugins, 'marks', false)
    const result = await runInstalledPlugin(disabled, 'marks', { frame })
    expect(result).toEqual({ ok: false, error: 'Enable this plugin before running it.' })
    expect(frames).toBe(0)
  })
})

import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { installPlugin, setPluginEnabled } from '@/app/plugins/catalog'
import { PLUGIN_CALL_UNAVAILABLE_MESSAGE } from '@/app/plugins/messages'
import { runInstalledPlugin, runPluginInFrame } from '@/app/plugins/sandbox/evaluate'
import type { PluginHost } from '@/app/plugins/sandbox/host'
import { blockPluginNetwork, PLUGIN_NETWORK_UNAVAILABLE_ERROR } from '@/app/plugins/sandbox/network'
import {
  PLUGIN_SANDBOX_CALL,
  PLUGIN_SANDBOX_CALL_RESULT,
  PLUGIN_SANDBOX_READY,
  PLUGIN_SANDBOX_RESULT,
  PLUGIN_SANDBOX_RUN,
  PLUGIN_POINTER_CALL,
  PLUGIN_RESULT_MAX_CHARS,
  pluginFrameMessageSchema,
  pluginHostMessageSchema,
  pluginRunRequestSchema,
  pluginRunResultSchema
} from '@/app/plugins/sandbox/schema'
import { PLUGIN_RESULT_INVALID_ERROR, runPluginProgram } from '@/app/plugins/sandbox/worker/run'
import type { SandboxFrame } from '@/app/runtime/sandbox-frame'

function parse<T>(
  schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>
): (input: unknown) => unknown {
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

/** A frame that stays open, so a test sends the call and result messages itself. */
function openFrame() {
  const sent: unknown[] = []
  let handler: ((data: unknown) => void) | undefined
  const frame: SandboxFrame = {
    postMessage(message) {
      sent.push(message)
    },
    listen(callback) {
      handler = callback
      queueMicrotask(() => callback({ type: PLUGIN_SANDBOX_READY }))
      return () => undefined
    },
    dispose: () => undefined
  }
  return { frame, sent, send: (data: unknown) => handler?.(data) }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('plugin sandbox messages', () => {
  test('accepts a well-formed run request and refuses one that is not', () => {
    expect(parse(pluginRunRequestSchema)({ id: 'a', source: 'return 1' })).toEqual({
      id: 'a',
      source: 'return 1'
    })
    expect(() => parse(pluginRunRequestSchema)({ id: 'a' })).toThrow()
    expect(() => parse(pluginHostMessageSchema)({ type: PLUGIN_SANDBOX_READY })).toThrow()
    expect(
      parse(pluginHostMessageSchema)({ type: PLUGIN_SANDBOX_RUN, id: 'a', source: '' })
    ).toEqual({ type: PLUGIN_SANDBOX_RUN, id: 'a', source: '' })
  })

  test('accepts both plugin results and refuses a payload that is not JSON text', () => {
    const succeeded = { type: PLUGIN_SANDBOX_RESULT, id: 'a', ok: true as const, result: '{"n":1}' }
    const failed = { type: PLUGIN_SANDBOX_RESULT, id: 'a', ok: false as const, error: 'no' }
    expect(parse(pluginFrameMessageSchema)(succeeded)).toEqual(succeeded)
    expect(parse(pluginFrameMessageSchema)(failed)).toEqual(failed)
    expect(
      parse(pluginRunResultSchema)({
        id: 'a',
        ok: true,
        result: 'x'.repeat(PLUGIN_RESULT_MAX_CHARS)
      })
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
  test('returns what the program returned as JSON text', async () => {
    const result = await runPluginProgram(request('return { marks: [1, 2, 3] }'))
    if (!result.ok) throw new Error(result.error)
    expect(JSON.parse(result.result)).toEqual({ marks: [1, 2, 3] })
  })

  test('a program that returns nothing succeeds with no result text', async () => {
    expect(await runPluginProgram(request('const unused = 1'))).toMatchObject({
      ok: true,
      result: ''
    })
  })

  test('hands the program a frozen API with its call and pointer', async () => {
    expect(
      await runPluginProgram(
        request(`
        const keys = Object.keys(plugin)
        const sealed = Object.isFrozen(plugin)
        return { keys, sealed }
      `)
      )
    ).toMatchObject({ ok: true, result: '{"keys":["call","pointer"],"sealed":true}' })
  })

  test('the pointer method asks the host for the canvas sequence', async () => {
    const calls: { name: string; args: unknown }[] = []
    const result = await runPluginProgram(
      request('const points = await plugin.pointer(); return points'),
      async (name, args) => {
        calls.push({ name, args })
        return [{ x: 2, y: 3 }]
      }
    )
    expect(calls).toEqual([{ name: PLUGIN_POINTER_CALL, args: {} }])
    expect(result).toMatchObject({ ok: true, result: '[{"x":2,"y":3}]' })
  })

  test('reports a thrown error and a value that cannot cross as JSON text', async () => {
    expect(await runPluginProgram(request('throw new Error("no marks")'))).toEqual({
      id: 'run-1',
      ok: false,
      error: 'no marks'
    })
    const circular = await runPluginProgram(request('const a = {}; a.self = a; return a'))
    expect(circular).toEqual({ id: 'run-1', ok: false, error: PLUGIN_RESULT_INVALID_ERROR })
    const huge = await runPluginProgram(
      request(`return "x".repeat(${PLUGIN_RESULT_MAX_CHARS + 1})`)
    )
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
    expect(await runPluginInFrame(looping.frame, 'while (true) {}', { timeoutMs: 20 })).toEqual({
      ok: false,
      error: 'Plugin timed out.'
    })
    expect(looping.disposals()).toBe(1)
    const later = frameDouble((_source, id) => ({
      type: PLUGIN_SANDBOX_RESULT,
      id,
      ok: false,
      error: 'no marks'
    }))
    expect(
      await runPluginInFrame(later.frame, 'throw new Error("no marks")', { timeoutMs: 20 })
    ).toEqual({ ok: false, error: 'no marks' })
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

  test('a call from the frame is answered by the host and the answer goes back', async () => {
    const calls: { name: string; args: unknown }[] = []
    const sent: unknown[] = []
    let handler: ((data: unknown) => void) | undefined
    const frame: SandboxFrame = {
      postMessage(message) {
        sent.push(message)
      },
      listen(callback) {
        handler = callback
        queueMicrotask(() => callback({ type: PLUGIN_SANDBOX_READY }))
        return () => undefined
      },
      dispose: () => undefined
    }
    const host: PluginHost = {
      call: async (name, args) => {
        calls.push({ name, args })
        return { shapes: 1 }
      },
      finish: () => undefined
    }
    const run = runPluginInFrame(frame, 'return 1', { timeoutMs: 20, host })
    await Promise.resolve()
    handler?.({
      type: PLUGIN_SANDBOX_CALL,
      callId: 'c1',
      name: 'get_selection',
      args: { depth: 0 }
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toEqual([{ name: 'get_selection', args: { depth: 0 } }])
    expect(sent).toContainEqual({
      type: PLUGIN_SANDBOX_CALL_RESULT,
      callId: 'c1',
      ok: true,
      result: '{"shapes":1}'
    })
    handler?.({
      type: PLUGIN_SANDBOX_RESULT,
      id: (sent[0] as { id: string }).id,
      ok: true,
      result: '"done"'
    })
    expect(await run).toEqual({ ok: true, result: 'done' })
  })

  test('a call with no host is refused, and a call that fails carries the reason', async () => {
    const sent: unknown[] = []
    let handler: ((data: unknown) => void) | undefined
    const frame: SandboxFrame = {
      postMessage: (message) => {
        sent.push(message)
      },
      listen(callback) {
        handler = callback
        queueMicrotask(() => callback({ type: PLUGIN_SANDBOX_READY }))
        return () => undefined
      },
      dispose: () => undefined
    }
    const run = runPluginInFrame(frame, 'return 1', { timeoutMs: 20 })
    await Promise.resolve()
    handler?.({ type: PLUGIN_SANDBOX_CALL, callId: 'c1', name: 'get_selection', args: {} })
    expect(sent).toContainEqual({
      type: PLUGIN_SANDBOX_CALL_RESULT,
      callId: 'c1',
      ok: false,
      error: PLUGIN_CALL_UNAVAILABLE_MESSAGE
    })
    handler?.({
      type: PLUGIN_SANDBOX_RESULT,
      id: (sent[0] as { id: string }).id,
      ok: false,
      error: 'no marks'
    })
    expect(await run).toEqual({ ok: false, error: 'no marks' })
  })

  test('a pointer wait does not use up the run deadline', async () => {
    const { frame, sent, send } = openFrame()
    let release: (points: unknown) => void = () => undefined
    const host: PluginHost = {
      call: (name) =>
        name === PLUGIN_POINTER_CALL
          ? new Promise((resolve) => {
              release = resolve
            })
          : Promise.resolve(undefined),
      finish: () => undefined
    }
    const run = runPluginInFrame(frame, 'return 1', { timeoutMs: 20, host })
    await Promise.resolve()
    send({ type: PLUGIN_SANDBOX_CALL, callId: 'c1', name: PLUGIN_POINTER_CALL, args: {} })
    await wait(40)
    release([{ x: 1, y: 2 }])
    await Promise.resolve()
    await Promise.resolve()
    expect(sent).toContainEqual({
      type: PLUGIN_SANDBOX_CALL_RESULT,
      callId: 'c1',
      ok: true,
      result: '[{"x":1,"y":2}]'
    })
    send({
      type: PLUGIN_SANDBOX_RESULT,
      id: (sent[0] as { id: string }).id,
      ok: true,
      result: '"done"'
    })
    expect(await run).toEqual({ ok: true, result: 'done' })
  })

  test('the deadline runs again once the pointer is answered', async () => {
    const { frame, send } = openFrame()
    let release: () => void = () => undefined
    const host: PluginHost = {
      call: () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
      finish: () => undefined
    }
    const run = runPluginInFrame(frame, 'return 1', { timeoutMs: 30, host })
    await Promise.resolve()
    send({ type: PLUGIN_SANDBOX_CALL, callId: 'c1', name: PLUGIN_POINTER_CALL, args: {} })
    await wait(45)
    release()
    const started = Date.now()
    expect(await run).toEqual({ ok: false, error: 'Plugin timed out.' })
    expect(Date.now() - started).toBeGreaterThanOrEqual(20)
  })

  test('a plugin program awaits what its host call returns', async () => {
    const result = await runPluginProgram(
      request('const found = await plugin.call("get_selection", { depth: 0 }); return found.marks'),
      async (name, args) => ({ name, args, marks: 7 })
    )
    expect(result).toMatchObject({ ok: true, result: '7' })
    const failed = await runPluginProgram(
      request('const value = await plugin.call("make_coffee"); return value'),
      async () => {
        throw new Error('No tool named "make_coffee".')
      }
    )
    expect(failed).toEqual({ id: 'run-1', ok: false, error: 'No tool named "make_coffee".' })
  })
})

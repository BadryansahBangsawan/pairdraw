import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import type { ScriptInputValue } from '@open-pencil/scene-graph/script'

import { runInFrame, type ScriptFrame } from '@/app/code/script/sandbox/evaluate'
import { mulberry32, scriptSeed } from '@/app/code/script/sandbox/random'
import {
  SCRIPT_SANDBOX_READY,
  SCRIPT_SANDBOX_RESULT,
  SCRIPT_SANDBOX_RUN,
  scriptFrameMessageSchema,
  scriptHostMessageSchema,
  scriptNodeSpecSchema,
  scriptRunRequestSchema,
  scriptRunResultSchema
} from '@/app/code/script/sandbox/schema'
import { countScriptNodes, type ScriptNodeSpec } from '@/app/code/script/sandbox/spec'
import {
  SCRIPT_EMPTY_OUTPUT_ERROR,
  SCRIPT_INVALID_OUTPUT_ERROR,
  SCRIPT_TOO_MANY_NODES_ERROR,
  runScript
} from '@/app/code/script/sandbox/worker/run'

/** The parsed output, or a throw, so a test states what a bad message does. */
function parse<T>(schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>): (input: unknown) => T {
  return (input) => v.parse(schema, input)
}

const request = (source: string, inputs: Record<string, ScriptInputValue> = {}, seed = 1) => ({
  id: 'run-1',
  source,
  inputs,
  seed
})

describe('script runner', () => {
  test('draws the tree the source describes from its inputs', () => {
    const result = runScript(
      request(
        `
        return pencil.frame({ width: 200, height: 100, layout: 'VERTICAL', padding: 8 }, [
          pencil.text({ text: pencil.inputs.title, fontSize: 24 }),
          pencil.rect({ width: 40, height: 40, fill: '#ff0000' })
        ])
      `,
        { title: 'Card' }
      )
    )
    if (!result.ok) throw new Error(result.error)
    expect(result.roots).toMatchObject([
      {
        type: 'FRAME',
        width: 200,
        height: 100,
        layout: 'VERTICAL',
        padding: 8,
        children: [
          { type: 'TEXT', text: 'Card', fontSize: 24 },
          { type: 'RECTANGLE', width: 40, height: 40, fill: '#ff0000' }
        ]
      }
    ])
    expect(countScriptNodes(result.roots as ScriptNodeSpec[])).toBe(3)
  })

  test('rejects components by name, invalid layers, and thrown errors', () => {
    expect(runScript(request(`return pencil.node('INSTANCE', {})`))).toEqual({
      id: 'run-1',
      ok: false,
      error:
        'Script cannot draw a "INSTANCE" layer; it can draw FRAME, RECTANGLE, ROUNDED_RECTANGLE, ELLIPSE, TEXT, LINE.'
    })
    expect(runScript(request(`return pencil.rect({ width: -1 })`))).toEqual({
      id: 'run-1',
      ok: false,
      error: SCRIPT_INVALID_OUTPUT_ERROR
    })
    expect(runScript(request(`return 'not a layer'`)).ok).toBe(false)
    expect(runScript(request(`throw new Error('boom')`))).toEqual({
      id: 'run-1',
      ok: false,
      error: 'boom'
    })
  })

  test('needs a layer back', () => {
    expect(runScript(request('const unused = 1'))).toEqual({
      id: 'run-1',
      ok: false,
      error: SCRIPT_EMPTY_OUTPUT_ERROR
    })
    expect(runScript(request('return []')).ok).toBe(false)
  })

  test('refuses to draw past the node budget', () => {
    expect(runScript(request('for (;;) pencil.rect({}); return []'))).toEqual({
      id: 'run-1',
      ok: false,
      error: SCRIPT_TOO_MANY_NODES_ERROR
    })
    // A tree the source builds in one call is checked by the same budget.
    const children = (count: number) =>
      Array.from({ length: count }, () => 'pencil.rect({})').join(',')
    expect(runScript(request(`return pencil.frame({}, [${children(1_000)}])`))).toEqual({
      id: 'run-1',
      ok: false,
      error: SCRIPT_TOO_MANY_NODES_ERROR
    })
    expect(runScript(request(`return pencil.frame({}, [${children(999)}])`)).ok).toBe(true)
  })

  test('keeps an oversized layer out of the host', () => {
    expect(runScript(request(`return pencil.text({ text: 'x'.repeat(20_000) })`))).toEqual({
      id: 'run-1',
      ok: false,
      error: SCRIPT_INVALID_OUTPUT_ERROR
    })
  })

  test('seeds Math.random with the node and its source', () => {
    const source = 'return pencil.rect({ x: Math.random() })'
    const first = runScript(request(source))
    const again = runScript(request(source))
    const other = runScript(request(source, {}, 2))
    if (!first.ok || !again.ok || !other.ok) throw new Error('run failed')
    expect(first.roots).toEqual(again.roots)
    expect(first.roots).not.toEqual(other.roots)
    expect(scriptSeed('1:2', source)).toBe(scriptSeed('1:2', source))
    expect(scriptSeed('1:3', source)).not.toBe(scriptSeed('1:2', source))
    expect(mulberry32(7)()).toBe(mulberry32(7)())
    expect(mulberry32(7)()).toBeGreaterThanOrEqual(0)
    expect(mulberry32(7)()).toBeLessThan(1)
  })
})

describe('script sandbox messages', () => {
  test('parse what each side sends and nothing else', () => {
    expect(
      parse(scriptHostMessageSchema)({ type: SCRIPT_SANDBOX_RUN, ...request('return 1') })
    ).toEqual({
      type: SCRIPT_SANDBOX_RUN,
      id: 'run-1',
      source: 'return 1',
      inputs: {},
      seed: 1
    })
    expect(parse(scriptFrameMessageSchema)({ type: SCRIPT_SANDBOX_READY })).toEqual({
      type: SCRIPT_SANDBOX_READY
    })
    expect(
      parse(scriptFrameMessageSchema)({
        type: SCRIPT_SANDBOX_RESULT,
        id: 'run-1',
        ok: true,
        roots: [{ type: 'ELLIPSE' }]
      })
    ).toMatchObject({ type: SCRIPT_SANDBOX_RESULT, id: 'run-1', ok: true })
    expect(parse(scriptRunResultSchema)({ id: 'run-1', ok: false, error: 'boom' })).toBeDefined()
    expect(() => parse(scriptFrameMessageSchema)({ type: 'other' })).toThrow()
    expect(() => parse(scriptHostMessageSchema)({ type: SCRIPT_SANDBOX_RUN, id: 1 })).toThrow()
  })

  test('rejects a layer with an unknown type or a bad color', () => {
    expect(() => parse(scriptNodeSpecSchema)({ type: 'COMPONENT' })).toThrow()
    expect(() => parse(scriptNodeSpecSchema)({ type: 'RECTANGLE', fill: 'red' })).toThrow()
    expect(parse(scriptNodeSpecSchema)({ type: 'RECTANGLE', fill: '#ff0000ff' })).toBeDefined()
  })

  test('rejects a color input with a non-finite component', () => {
    const request = (accent: Record<string, number>) => ({
      type: SCRIPT_SANDBOX_RUN,
      id: 'run-1',
      source: 'return []',
      inputs: { accent },
      seed: 1
    })
    const accent = { r: 0.1, g: 0.2, b: 0.3, a: 1 }
    expect(parse(scriptRunRequestSchema)(request(accent)).inputs.accent).toEqual(accent)
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => parse(scriptRunRequestSchema)(request({ ...accent, r: bad }))).toThrow()
    }
  })
})
describe('script sandbox host', () => {
  test('runs the source in the frame and checks the layers back', async () => {
    const sent: unknown[] = []
    let disposed = false
    let handler: ((data: unknown) => void) | undefined
    const frame: ScriptFrame = {
      postMessage(message) {
        sent.push(message)
        const { id, source, inputs } = message as {
          id: string
          source: string
          inputs: Record<string, ScriptInputValue>
        }
        const result = runScript({ id, source, inputs: inputs ?? {}, seed: 1 })
        queueMicrotask(() =>
          handler?.(
            result.ok
              ? { type: SCRIPT_SANDBOX_RESULT, id, ok: true, roots: result.roots }
              : { type: SCRIPT_SANDBOX_RESULT, id, ok: false, error: result.error }
          )
        )
      },
      listen(callback) {
        handler = callback
        queueMicrotask(() => callback({ type: SCRIPT_SANDBOX_READY }))
        return () => undefined
      },
      dispose() {
        disposed = true
      }
    }
    const evaluated = await runInFrame(frame, 'return pencil.ellipse({ width: 20, height: 20 })')
    expect(evaluated).toEqual({ ok: true, roots: [{ type: 'ELLIPSE', width: 20, height: 20 }] })
    expect(sent).toMatchObject([
      { type: SCRIPT_SANDBOX_RUN, source: 'return pencil.ellipse({ width: 20, height: 20 })' }
    ])
    expect(disposed).toBe(true)
  })

  test('gives up when the frame never becomes ready', async () => {
    const frame: ScriptFrame = {
      postMessage: () => undefined,
      listen: () => () => undefined,
      dispose: () => undefined
    }
    expect(
      await runInFrame(frame, 'return pencil.rect({})', { timeoutMs: 20, readyTimeoutMs: 20 })
    ).toEqual({
      ok: false,
      error: 'Script sandbox did not become ready.'
    })
  })

  test('times a run out and tears the frame down', async () => {
    let disposed = false
    const frame: ScriptFrame = {
      postMessage: () => undefined,
      listen: (callback) => {
        queueMicrotask(() => callback({ type: SCRIPT_SANDBOX_READY }))
        return () => undefined
      },
      dispose() {
        disposed = true
      }
    }
    expect(await runInFrame(frame, 'return pencil.rect({})', { timeoutMs: 20 })).toEqual({
      ok: false,
      error: 'Script timed out.'
    })
    expect(disposed).toBe(true)
  })

  test('drops a layer the host cannot accept instead of drawing it', async () => {
    let handler: ((data: unknown) => void) | undefined
    const frame: ScriptFrame = {
      postMessage(message) {
        const { id } = message as { id: string }
        queueMicrotask(() =>
          handler?.({ type: SCRIPT_SANDBOX_RESULT, id, ok: true, roots: [{ type: 'COMPONENT' }] })
        )
      },
      listen(callback) {
        handler = callback
        queueMicrotask(() => callback({ type: SCRIPT_SANDBOX_READY }))
        return () => undefined
      },
      dispose: () => undefined
    }
    expect(await runInFrame(frame, 'return pencil.rect({})')).toEqual({
      ok: false,
      error: 'Script output is not a valid layer.'
    })
  })
})

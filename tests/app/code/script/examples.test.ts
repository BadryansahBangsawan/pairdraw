import { expect, test } from 'bun:test'

import * as v from 'valibot'

import { SCRIPT_EXAMPLES } from '@open-pencil/core/tools'

import { scriptNodeSpecSchema } from '@/app/code/script/sandbox/schema'
import type { ScriptNodeSpec } from '@/app/code/script/sandbox/spec'
import { runScript } from '@/app/code/script/sandbox/worker/run'

/** The host parses every drawn layer before it materializes it, so the test does the same. */
function specProblems(spec: unknown): string[] {
  const parsed = v.safeParse(scriptNodeSpecSchema, spec)
  return parsed.success ? [] : parsed.issues.map((issue) => issue.message)
}

/** Each example runs in the worker as the app runs it, so a shipped example cannot rot. */
for (const [name, source] of Object.entries(SCRIPT_EXAMPLES)) {
  test(`the ${name} example draws valid layers`, () => {
    const result = runScript({ id: name, source, inputs: {}, seed: 1 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.roots.length).toBeGreaterThan(0)
    for (const root of result.roots) expect(specProblems(root)).toEqual([])
  })
}

test('the stat card example shows a label, a figure, and a trend', () => {
  const result = runScript({ id: 'stat', source: SCRIPT_EXAMPLES.stat_card, inputs: {}, seed: 1 })
  if (!result.ok) throw new Error(result.error)
  const card = result.roots[0] as ScriptNodeSpec | undefined
  const texts = (card?.children ?? []).map((child) => child.text)
  expect(texts).toEqual(['Monthly active', '24,916', '+12.4% vs last month'])
})

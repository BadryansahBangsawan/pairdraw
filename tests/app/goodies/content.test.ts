import { expect, test } from 'bun:test'

import * as v from 'valibot'

import { styleKitSchema } from '@/app/ai/chat/pins/schema'
import { scriptNodeSpecSchema } from '@/app/code/script/sandbox/schema'
import { runScript } from '@/app/code/script/sandbox/worker/run'
import { parseScriptHeader } from '@/app/code/script/schema-header'
import { GOODIE_SCRIPTS } from '@/app/goodies/scripts'
import { GOODIE_STYLES } from '@/app/goodies/styles'

/** Each script runs in the worker as the app runs it, so a shipped one cannot rot. */
for (const script of GOODIE_SCRIPTS) {
  test(`the ${script.id} script draws valid layers`, () => {
    const result = runScript({ id: script.id, source: script.source, inputs: {}, seed: 1 })
    if (!result.ok) throw new Error(result.error)
    expect(result.roots.length).toBeGreaterThan(0)
    for (const root of result.roots) {
      expect(v.safeParse(scriptNodeSpecSchema, root).success).toBe(true)
    }
  })
}

test('the scripts with controls declare them, and follow a value set there', () => {
  const dots = GOODIE_SCRIPTS.find((script) => script.id === 'dots')
  if (!dots) throw new Error('No dots script')
  expect(parseScriptHeader(dots.source).map((input) => input.name)).toEqual(['count'])
  const result = runScript({ id: 'dots', source: dots.source, inputs: { count: 5 }, seed: 1 })
  if (!result.ok) throw new Error(result.error)
  const frame = v.parse(scriptNodeSpecSchema, result.roots[0])
  expect(frame.children).toHaveLength(5)
})

test('every style is a kit the chat can pin as it is, each with a name of its own', () => {
  for (const style of GOODIE_STYLES) {
    expect(v.parse(styleKitSchema, style.kit)).toEqual(style.kit)
  }
  expect(new Set(GOODIE_STYLES.map((style) => style.id)).size).toBe(GOODIE_STYLES.length)
  expect(new Set(GOODIE_STYLES.map((style) => style.kit.name)).size).toBe(GOODIE_STYLES.length)
})

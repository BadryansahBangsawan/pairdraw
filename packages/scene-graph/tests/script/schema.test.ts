import { describe, expect, test } from 'bun:test'
import * as v from 'valibot'

import { scriptNodeSchema } from '@pairdraw/scene-graph/script'

const parse = (inputs: Record<string, unknown>) =>
  v.safeParse(scriptNodeSchema, { version: 1, source: 'return []', inputs })

describe('a script node’s stored inputs', () => {
  test('a color keeps its four components', () => {
    const accent = { r: 0.1, g: 0.2, b: 0.3, a: 1 }
    const parsed = parse({ accent })
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.output.inputs?.accent).toEqual(accent)
  })

  test('a color with a non-finite component is refused, as a number input is', () => {
    for (const r of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(parse({ accent: { r, g: 0, b: 0, a: 1 } }).success).toBe(false)
    }
    expect(parse({ width: Number.NaN }).success).toBe(false)
    expect(parse({ width: Number.POSITIVE_INFINITY }).success).toBe(false)
  })
})

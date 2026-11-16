import { describe, expect, test } from 'bun:test'

import { tryParseColor } from '@pairdraw/scene-graph/color'

describe('tryParseColor', () => {
  test('reads a `none` channel as zero', () => {
    expect(tryParseColor('rgb(none 255 0)')).toEqual({ r: 0, g: 1, b: 0, a: 1 })
  })
})

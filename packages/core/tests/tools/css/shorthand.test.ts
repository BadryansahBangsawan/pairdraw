import { describe, expect, test } from 'bun:test'

import { parseLengthShorthand } from '#core/tools/css/shorthand'

function parsed(value: number | string, max = 4 as 1 | 2 | 4) {
  return parseLengthShorthand(value, max, 'padding')
}

describe('parseLengthShorthand', () => {
  test('one value covers every side', () => {
    expect(parsed('24px')).toEqual([24, 24, 24, 24])
    expect(parsed('24')).toEqual([24, 24, 24, 24])
    expect(parsed(24)).toEqual([24, 24, 24, 24])
  })

  test('two values read as vertical then horizontal, as CSS does', () => {
    expect(parsed('16px 24px')).toEqual([16, 24, 16, 24])
    expect(parsed('16 24.5')).toEqual([16, 24.5, 16, 24.5])
  })

  test('three values read as top, horizontal, bottom', () => {
    expect(parsed('8px 16px 4px')).toEqual([8, 16, 4, 16])
  })

  test('four values read clockwise from the top', () => {
    expect(parsed('8px 16px 4px 24px')).toEqual([8, 16, 4, 24])
    expect(parsed('0 0 4px 0')).toEqual([0, 0, 4, 0])
  })

  test('a two-slot field takes at most two values', () => {
    expect(parseLengthShorthand('12px 4px', 2, 'gap')).toEqual([12, 4])
    expect(parseLengthShorthand('12px', 2, 'gap')).toEqual([12, 12])
    expect(parseLengthShorthand('12px 4px 2px', 2, 'gap')).toEqual({
      error: '"gap" takes 1 to 2 lengths, got 3'
    })
  })

  test('a one-slot field refuses a second value', () => {
    expect(parseLengthShorthand('12px 4px', 1, 'radius')).toEqual({
      error: '"radius" takes 1 to 1 lengths, got 2'
    })
  })

  test('refuses a negative length, naming the field', () => {
    expect(parsed('-4px')).toEqual({ error: '"padding" must not be negative' })
  })

  test('refuses a length it cannot parse, quoting it', () => {
    expect(parsed('24em')).toEqual({ error: '"padding" expects px lengths, got "24em"' })
    expect(parsed('auto')).toEqual({ error: '"padding" expects px lengths, got "auto"' })
  })

  test('refuses an empty string', () => {
    expect(parsed('   ')).toEqual({ error: '"padding" expects at least one length' })
  })
})

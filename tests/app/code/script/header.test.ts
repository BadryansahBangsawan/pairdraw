import { describe, expect, test } from 'bun:test'

import { declarationKinds, inputValue, parseScriptHeader } from '@/app/code/script/schema-header'

const header = (lines: string) => `/*\n * @schema\n${lines}\n */\nreturn []`

describe('the @schema header', () => {
  test('declares every kind with its default', () => {
    const inputs = parseScriptHeader(
      header(
        [
          ' * @input count number = 12',
          ' * @input label string = "Bars"',
          ' * @input smooth boolean = true',
          ' * @input accent color = #5b73f2',
          ' * @input mode enum(a,b,c) = b',
          ' * @input source ref'
        ].join('\n')
      )
    )

    expect(inputs.map((input) => [input.name, input.kind])).toEqual([
      ['count', 'number'],
      ['label', 'string'],
      ['smooth', 'boolean'],
      ['accent', 'color'],
      ['mode', 'enum'],
      ['source', 'ref']
    ])
    expect(inputs.map((input) => input.default)).toEqual([
      12,
      'Bars',
      true,
      { r: 0x5b / 255, g: 0x73 / 255, b: 0xf2 / 255, a: 1 },
      'b',
      undefined
    ])
    expect(inputs[4].options).toEqual(['a', 'b', 'c'])
  })

  test('reads a colour with an alpha channel', () => {
    const [input] = parseScriptHeader(header(' * @input accent color = #00000080'))
    expect(input.default).toEqual({ r: 0, g: 0, b: 0, a: 0x80 / 255 })
  })

  test('an enum without a default takes its first choice', () => {
    const [input] = parseScriptHeader(header(' * @input mode enum(small,large)'))
    expect(input.default).toBe('small')
  })

  test('skips malformed lines and keeps the rest', () => {
    const inputs = parseScriptHeader(
      header(
        [
          ' * @input count number = 12',
          ' * @input bad mystery',
          ' * @input = 4',
          ' * @input empty enum()',
          ' * @input label string'
        ].join('\n')
      )
    )
    expect(inputs.map((input) => input.name)).toEqual(['count', 'label'])
  })

  test('a repeated name is declared once, at its first line', () => {
    const inputs = parseScriptHeader(
      header(' * @input count number = 1\n * @input count string = "two"')
    )
    expect(inputs).toHaveLength(1)
    expect(inputs[0].default).toBe(1)
  })

  test('a default that does not fit its kind is dropped, not the input', () => {
    const [input] = parseScriptHeader(header(' * @input count number = many'))
    expect(input.kind).toBe('number')
    expect(input.default).toBeUndefined()
  })

  test('no header or no @schema marker declares nothing', () => {
    expect(parseScriptHeader('return []')).toEqual([])
    expect(parseScriptHeader('/*\n * @input count number\n */\nreturn []')).toEqual([])
  })

  test('only the leading block comment is read', () => {
    const source = 'return []\n/*\n * @schema\n * @input count number\n */'
    expect(parseScriptHeader(source)).toEqual([])
  })

  test('a kind map drives the bound-variable check', () => {
    const kinds = declarationKinds(parseScriptHeader(header(' * @input count number')))
    expect(kinds.get('count')).toBe('number')
    expect(kinds.get('missing')).toBeUndefined()
  })

  test('a stored value wins over the declared default, which wins over the zero value', () => {
    const [declared] = parseScriptHeader(header(' * @input count number = 3'))
    expect(inputValue(declared, 7)).toBe(7)
    expect(inputValue(declared, undefined)).toBe(3)
    expect(inputValue({ name: 'count', kind: 'number' }, undefined)).toBe(0)
    expect(inputValue({ name: 'source', kind: 'ref' }, undefined)).toBeUndefined()
  })
})

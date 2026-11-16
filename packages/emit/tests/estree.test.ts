import { describe, expect, test } from 'bun:test'

import { es } from '#emit/index'

describe('es.json', () => {
  test('writes a JSON value as source', () => {
    const value = { color: '#ff3300', count: -2, on: true, none: null, 'a-b': [0.5, { x: 1 }] }

    expect(es.printExpression(es.json(value))).toBe(
      "({\n  color: '#ff3300',\n  count: -2,\n  on: true,\n  none: null,\n  'a-b': [0.5, { x: 1 }]\n})"
    )
  })

  test('writes what JSON cannot hold as null', () => {
    expect(es.printExpression(es.json(Number.POSITIVE_INFINITY))).toBe('null')
    expect(es.printExpression(es.json(() => 1))).toBe('null')
  })
})

describe('es.fill', () => {
  test('inserts a hole node as given, so document text that reads like a hole stays text', () => {
    const template = es.parseModule('const a = $x')
    const filled = es.fill(template, { $x: es.string('$y'), $y: es.identifier('z') })

    expect(es.printModule(filled)).toBe("const a = '$y';")
  })
})

describe('es.fill with OMIT', () => {
  test('removes an omitted hole from arrays, arguments, and string-literal properties', () => {
    const template = es.parseModule(
      "const a = [$x, 2];\nf($x, $y);\nconst o = { k: '$x', v: $x, w: 1 };"
    )
    const filled = es.fill(template, { $x: es.OMIT, $y: es.identifier('y') })

    expect(es.printModule(filled)).toBe('const a = [2];\n\nf(y);\n\nconst o = { w: 1 };')
  })
})

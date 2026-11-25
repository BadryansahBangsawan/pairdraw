import { describe, expect, test } from 'bun:test'

import { SHADER_SHAPES, shaderShapeType, withShapeType } from '@pairdraw/vue/controls/shader'

describe('shaderShapeType', () => {
  test('reads the type out of a shape written as JSON', () => {
    expect(shaderShapeType('{"type":"sphere3D","radius":0.35}')).toBe('sphere3D')
    expect(shaderShapeType('{"type":"dot"}')).toBe('dot')
  })

  test('is empty for a value that is not a shape', () => {
    expect(shaderShapeType(undefined)).toBe('')
    expect(shaderShapeType('not json')).toBe('')
    expect(shaderShapeType('{"radius":1}')).toBe('')
  })
})

describe('withShapeType', () => {
  test('keeps the rest of the shape, so its size survives a type change', () => {
    expect(withShapeType('{"type":"sphere3D","radius":0.35}', 'dot')).toBe(
      '{"type":"dot","radius":0.35}'
    )
  })

  test('starts a shape when the value is not one', () => {
    expect(withShapeType('', 'bars')).toBe('{"type":"bars"}')
    expect(withShapeType('not json', 'streak')).toBe('{"type":"streak"}')
  })

  test('offers the types the library draws', () => {
    expect(SHADER_SHAPES).toEqual(['sphere3D', 'dot', 'bars', 'streak'])
  })
})

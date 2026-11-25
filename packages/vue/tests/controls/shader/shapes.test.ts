import { describe, expect, test } from 'bun:test'

import { SHAPE3D_DEFAULTS, SHAPE3D_TYPES } from 'shaders/core'

import { SHADER_SHAPES, shaderShapeType, withShapeType } from '@pairdraw/vue/controls/shader'

describe('shaderShapeType', () => {
  test('reads the type out of a shape written as JSON', () => {
    expect(shaderShapeType('{"type":"sphere3D","radius":0.35}')).toBe('sphere3D')
    expect(shaderShapeType('{"type":"cube3D"}')).toBe('cube3D')
  })

  test('is empty for a value that is not a shape', () => {
    expect(shaderShapeType(undefined)).toBe('')
    expect(shaderShapeType('not json')).toBe('')
    expect(shaderShapeType('{"radius":1}')).toBe('')
  })
})

describe('withShapeType', () => {
  test('keeps the rest of the shape, so its size survives a type change', () => {
    expect(withShapeType('{"type":"sphere3D","radius":0.35}', 'sphere3D')).toBe(
      '{"type":"sphere3D","radius":0.35}'
    )
  })

  test('starts a shape with the defaults the library draws it from', () => {
    expect(JSON.parse(withShapeType('', 'cube3D'))).toEqual({
      ...SHAPE3D_DEFAULTS.cube3D,
      type: 'cube3D'
    })
    expect(JSON.parse(withShapeType('not json', 'gyroscope3D'))).toEqual({
      ...SHAPE3D_DEFAULTS.gyroscope3D,
      type: 'gyroscope3D'
    })
  })

  test('offers exactly the shapes the library accepts', () => {
    expect([...SHADER_SHAPES]).toEqual([...SHAPE3D_TYPES])
  })
})

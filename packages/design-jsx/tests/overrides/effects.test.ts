import { describe, expect, test } from 'bun:test'

import { jsxNodeFields, parseJSXAttributes } from '#design-jsx/index'

import { SceneGraph } from '@pairdraw/scene-graph'

function effects(attributes: string) {
  const graph = new SceneGraph()
  return jsxNodeFields(graph, 'FRAME', parseJSXAttributes(attributes), graph.getPages()[0].id)
    .fields.effects
}

const RED = { r: 1, g: 0, b: 0, a: 1 }
const SHADOW_COLOR = { r: 0, g: 0, b: 0, a: 0.35 }

describe('an effects array', () => {
  test('refuses a shadow that has no color, and the error names color', () => {
    expect(() => effects('effects={[{ type: "DROP_SHADOW", radius: 16, visible: true }]}')).toThrow(
      /color/i
    )
  })

  test('refuses a radius that is not a number, and the error names radius', () => {
    expect(() =>
      effects(
        'effects={[{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.35 }, radius: "16", visible: true }]}'
      )
    ).toThrow(/radius/i)
  })

  test('refuses a type that is not an effect name, and the error names type', () => {
    expect(() =>
      effects(
        'effects={[{ type: "drop-shadow", color: { r: 0, g: 0, b: 0, a: 0.35 }, radius: 16, visible: true }]}'
      )
    ).toThrow(/type/i)
  })

  test('keeps a helper-built drop shadow, including its offset', () => {
    expect(effects('effects={[dropShadow()]}')).toEqual([
      expect.objectContaining({
        type: 'DROP_SHADOW',
        offset: { x: 0, y: 4 },
        radius: 8
      })
    ])
  })

  test('fills the missing side of a partial offset and uses the blur default', () => {
    expect(
      effects(
        'effects={[{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.35 }, radius: 16, offset: { x: 5 }, visible: true }]}'
      )
    ).toEqual([expect.objectContaining({ offset: { x: 5, y: 4 } })])
    expect(
      effects(
        'effects={[{ type: "LAYER_BLUR", color: { r: 0, g: 0, b: 0, a: 0 }, radius: 8, visible: true }]}'
      )
    ).toEqual([expect.objectContaining({ type: 'LAYER_BLUR', offset: { x: 0, y: 0 } })])
  })

  test('keeps a shader effect that has source', () => {
    expect(
      effects(
        'effects={[{ type: "SHADER", source: "half4 main() { return half4(1); }", visible: true }]}'
      )
    ).toEqual([
      expect.objectContaining({
        type: 'SHADER',
        source: 'half4 main() { return half4(1); }',
        visible: true
      })
    ])
  })

  test('stores a blur that omits its color as transparent', () => {
    const transparent = { r: 0, g: 0, b: 0, a: 0 }
    for (const type of ['LAYER_BLUR', 'BACKGROUND_BLUR', 'FOREGROUND_BLUR']) {
      expect(effects(`effects={[{ type: "${type}", radius: 20, visible: true }]}`)).toEqual([
        expect.objectContaining({
          type,
          color: transparent,
          radius: 20,
          offset: { x: 0, y: 0 }
        })
      ])
    }
  })

  test('reads a shadow blend mode with the same spelling as a layer blendMode', () => {
    expect(effects('effects={[dropShadow({ blendMode: "multiply" })]}')).toEqual([
      expect.objectContaining({ type: 'DROP_SHADOW', blendMode: 'MULTIPLY' })
    ])
    expect(
      effects(
        'effects={[{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.35 }, radius: 8, blendMode: "MULTIPLY", visible: true }]}'
      )
    ).toEqual([expect.objectContaining({ blendMode: 'MULTIPLY' })])
  })

  test('stores a drop shadow that omits its offset with the shadow default', () => {
    expect(
      effects(
        'effects={[{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.35 }, radius: 16, visible: true }]}'
      )
    ).toEqual([
      expect.objectContaining({
        type: 'DROP_SHADOW',
        color: SHADOW_COLOR,
        offset: { x: 0, y: 4 },
        radius: 16
      })
    ])
  })
})

describe('the shadow prop', () => {
  test.each([
    ['the color last', 'shadow="0 4 8 #ff0000"'],
    ['the color first', 'shadow="rgb(255 0 0) 0 4px 8px"']
  ])('reads a shadow with %s', (_case, attributes) => {
    expect(effects(attributes)).toEqual([
      {
        type: 'DROP_SHADOW',
        color: RED,
        offset: { x: 0, y: 4 },
        radius: 8,
        spread: 0,
        visible: true
      }
    ])
  })

  test('reads spread and every layer of a shadow list', () => {
    expect(effects('shadow="0 4 8 2 #ff0000, inset 0 1 0 #000"')).toMatchObject([
      { type: 'DROP_SHADOW', spread: 2, color: RED },
      { type: 'INNER_SHADOW', offset: { x: 0, y: 1 } }
    ])
  })
})

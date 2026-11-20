import { describe, expect, test } from 'bun:test'

import { modeledEffectIndexes } from '#fig/node-change/paint'
import { remapEffectBindings, remapEffectBindingsToRaw } from '#fig/node-change/plugin-data'

import type { Effect } from '@pairdraw/kiwi/fig/codec'

/** A repeat, which the scene graph leaves out, before a shadow and a noise it models. */
const effects: Effect[] = [
  {
    type: 'REPEAT',
    color: { r: 0, g: 0, b: 0, a: 1 },
    radius: 0,
    visible: true
  },
  {
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.2 },
    offset: { x: 0, y: 2 },
    radius: 4,
    visible: true
  },
  {
    type: 'NOISE',
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    noiseType: 'MONOTONE',
    visible: true,
    noiseSize: { x: 0.5, y: 0.5 },
    density: 1
  }
]

describe('effect bindings through the modeled effects', () => {
  test('an unmodeled effect takes no position of its own', () => {
    expect(modeledEffectIndexes(effects)).toEqual([null, 0, 1])
  })

  test('a binding follows its effect to the modeled position', () => {
    expect(
      remapEffectBindings(
        {
          'effects/1/radius': 'shadow-radius',
          'effects/2/color': 'noise-color',
          'effects/0/radius': 'repeat-radius',
          'fills/0/color': 'fill-color'
        },
        effects
      )
    ).toEqual({
      'effects/0/radius': 'shadow-radius',
      'effects/1/color': 'noise-color',
      'fills/0/color': 'fill-color'
    })
  })

  test('bindings pass through unchanged when the record lists no effects', () => {
    const bindings = { 'effects/1/radius': 'shadow-radius' }
    expect(remapEffectBindings(bindings, undefined)).toEqual(bindings)
  })

  test('a written record keys a binding by its raw position again', () => {
    expect(
      remapEffectBindingsToRaw(
        {
          'effects/0/radius': 'shadow-radius',
          'effects/1/color': 'noise-color',
          'fills/0/color': 'fill-color'
        },
        effects
      )
    ).toEqual({
      'effects/1/radius': 'shadow-radius',
      'effects/2/color': 'noise-color',
      'fills/0/color': 'fill-color'
    })
  })
})

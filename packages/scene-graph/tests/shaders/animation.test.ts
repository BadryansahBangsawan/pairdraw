import { describe, expect, test } from 'bun:test'

import { presetAnimates, type ShaderPreset } from '@pairdraw/scene-graph/shaders'

/** What the test's registry says of each effect; a type missing from it is not known yet. */
const KNOWN: Record<string, { animates: boolean; speed: boolean }> = {
  SolidColor: { animates: false, speed: false },
  Halftone: { animates: false, speed: false },
  Aurora: { animates: true, speed: true },
  FilmGrain: { animates: false, speed: false },
  Boids: { animates: false, speed: true }
}
const animated = (type: string) => KNOWN[type]

const preset = (...components: ShaderPreset['components']): ShaderPreset => ({ components })

describe('presetAnimates', () => {
  test('a preset of still effects never animates', () => {
    expect(presetAnimates(preset({ type: 'SolidColor' }, { type: 'Halftone' }), animated)).toBe(
      false
    )
  })

  test('an animated effect animates the preset', () => {
    expect(presetAnimates(preset({ type: 'SolidColor' }, { type: 'Aurora' }), animated)).toBe(true)
  })

  test('every animated effect at speed 0 leaves the preset still', () => {
    expect(
      presetAnimates(
        preset({ type: 'SolidColor' }, { type: 'Aurora', props: { speed: 0 } }),
        animated
      )
    ).toBe(false)
    expect(
      presetAnimates(
        preset(
          { type: 'Aurora', props: { speed: 0 } },
          { type: 'FilmGrain', props: { speed: 0 } }
        ),
        animated
      )
    ).toBe(false)
  })

  test('one effect still moving keeps the preset animating', () => {
    expect(
      presetAnimates(
        preset({ type: 'Aurora', props: { speed: 0 } }, { type: 'Aurora', props: {} }),
        animated
      )
    ).toBe(true)
  })

  test('an effect driven by speed animates unless speed is 0', () => {
    expect(presetAnimates(preset({ type: 'Boids' }), animated)).toBe(true)
    expect(presetAnimates(preset({ type: 'Boids', props: { speed: 0 } }), animated)).toBe(false)
  })

  test('the animated switch turns a still effect on', () => {
    expect(presetAnimates(preset({ type: 'FilmGrain', props: { animated: true } }), animated)).toBe(
      true
    )
    expect(
      presetAnimates(preset({ type: 'FilmGrain', props: { animated: false } }), animated)
    ).toBe(false)
  })

  test('an animated child animates its parent', () => {
    expect(
      presetAnimates(
        preset({ type: 'SolidColor', children: [{ type: 'Aurora' }] }),
        animated
      )
    ).toBe(true)
  })

  test('an effect the registry does not know yet is assumed to animate', () => {
    expect(presetAnimates(preset({ type: 'MadeUpEffect' }), animated)).toBe(true)
  })
})

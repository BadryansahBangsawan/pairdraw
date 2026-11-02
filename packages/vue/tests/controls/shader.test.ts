import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { shaderPresetSchema } from '@open-pencil/scene-graph/shaders'

import {
  addShaderEffect,
  DEFAULT_SHADER_PRESET,
  loadShaderCatalog,
  moveShaderEffect,
  parseShaderPreset,
  removeShaderEffect,
  SHADER_GALLERY,
  shaderGalleryEntryOf,
  shaderPresetColors,
  setShaderEffectProp,
  shaderPresetJSON
} from '#vue/controls/shader'

const PRESET = { components: [{ type: 'Aurora' }, { type: 'FilmGrain' }] }

describe('shader presets', () => {
  test('stack effects: added on top, moved, removed down to the last one', () => {
    const added = addShaderEffect(PRESET, 'Swirl')
    expect(added.components.map((c) => c.type)).toEqual(['Aurora', 'FilmGrain', 'Swirl'])

    const moved = moveShaderEffect(added, 2, 0)
    expect(moved.components.map((c) => c.type)).toEqual(['Swirl', 'Aurora', 'FilmGrain'])
    expect(moveShaderEffect(added, 0, 5)).toBe(added)

    const one = removeShaderEffect(removeShaderEffect(PRESET, 0), 0)
    expect(one.components.map((c) => c.type)).toEqual(['FilmGrain'])
  })

  test('sets one prop of one effect', () => {
    const next = setShaderEffectProp(PRESET, 1, 'strength', 0.4)
    expect(next.components).toEqual([
      { type: 'Aurora' },
      { type: 'FilmGrain', props: { strength: 0.4 } }
    ])
    expect(PRESET.components[1]).toEqual({ type: 'FilmGrain' })
  })

  test('reads a preset from JSON and rejects anything else', () => {
    expect(parseShaderPreset(shaderPresetJSON(PRESET))).toEqual(PRESET)
    expect(parseShaderPreset('{"components":[]}')).toBeNull()
    expect(parseShaderPreset('not json')).toBeNull()
  })
})

describe('shader catalog', () => {
  test('describes each effect with controls for its props', async () => {
    const catalog = await loadShaderCatalog()
    const aurora = catalog.find((effect) => effect.name === 'Aurora')

    expect(catalog.length).toBeGreaterThan(100)
    expect(aurora?.props.find((prop) => prop.key === 'colorA')).toMatchObject({
      kind: 'color',
      label: 'Color A',
      default: '#a533f8'
    })
    expect(aurora?.props.find((prop) => prop.key === 'curtainCount')).toMatchObject({
      kind: 'range',
      min: 1,
      max: 4,
      step: 1
    })
    expect(aurora?.props.find((prop) => prop.key === 'center')).toMatchObject({ kind: 'position' })
  })
})

/** Props every effect takes from the preset renderer itself rather than from its own controls. */
const RENDERER_PROPS = new Set(['blendMode', 'opacity', 'visible'])

describe('shader gallery', () => {
  test('offers complete shaders of more than one effect, each once', () => {
    expect(SHADER_GALLERY.length).toBeGreaterThanOrEqual(6)
    expect(new Set(SHADER_GALLERY.map((entry) => entry.id)).size).toBe(SHADER_GALLERY.length)
    for (const { preset } of SHADER_GALLERY) {
      expect(v.is(shaderPresetSchema, preset)).toBe(true)
      expect(preset.components.length).toBeGreaterThan(1)
      expect(parseShaderPreset(shaderPresetJSON(preset))).toEqual(preset)
    }
  })

  test('draws only effects the library has, with props their controls accept', async () => {
    const catalog = new Map((await loadShaderCatalog()).map((effect) => [effect.name, effect]))
    for (const { id, preset } of SHADER_GALLERY) {
      for (const component of preset.components) {
        const effect = catalog.get(component.type)
        expect(effect, `${id}: ${component.type}`).toBeDefined()
        for (const [key, value] of Object.entries(component.props ?? {})) {
          if (RENDERER_PROPS.has(key)) continue
          const control = effect?.props.find((prop) => prop.key === key)
          expect(control, `${id}: ${component.type}.${key}`).toBeDefined()
          if (control?.kind === 'range') {
            expect(typeof value).toBe('number')
            expect(Number(value)).toBeGreaterThanOrEqual(control.min)
            expect(Number(value)).toBeLessThanOrEqual(control.max)
          }
          if (control?.kind === 'select') {
            expect(control.options.some((option) => option.value === value)).toBe(true)
          }
          if (control?.kind === 'color') expect(value).toMatch(/^#[\da-f]{6}$/i)
        }
      }
    }
  })

  test('knows a gallery shader until any of its effects is edited', () => {
    const [first] = SHADER_GALLERY
    if (!first) throw new Error('The gallery is empty')
    const applied = structuredClone(first.preset)

    expect(shaderGalleryEntryOf(applied)?.id).toBe(first.id)
    expect(shaderGalleryEntryOf(setShaderEffectProp(applied, 0, 'seed', 99))).toBeNull()
    expect(shaderGalleryEntryOf(DEFAULT_SHADER_PRESET)).toBeNull()
  })

  test('reads the palette a shader sets, gradient stops included', () => {
    expect(
      shaderPresetColors({
        components: [
          {
            type: 'MeshGradient',
            props: {
              stops: [
                { color: '#112233', position: 0 },
                { color: '#AABBCC', position: 1 }
              ]
            }
          },
          { type: 'Dither', props: { colorA: 'transparent', colorB: '#112233' } },
          { type: 'Aurora', props: { colorA: '#445566', colorB: '#778899' } }
        ]
      })
    ).toEqual(['#112233', '#aabbcc', '#445566', '#778899'])
    expect(shaderPresetColors(DEFAULT_SHADER_PRESET)).toEqual([])
  })

  test('every gallery shader has a palette to stand in for it', () => {
    for (const { preset } of SHADER_GALLERY) {
      expect(shaderPresetColors(preset).length).toBeGreaterThan(1)
    }
  })
})

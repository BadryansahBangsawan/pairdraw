import { describe, expect, test } from 'bun:test'

import {
  parseShaderUniforms,
  SHADER_MAX_UNIFORM_FLOATS,
  SHADER_MAX_UNIFORMS,
  SHADER_SOURCE_MAX_BYTES
} from '@open-pencil/scene-graph/shaders'

const PEN_EXAMPLE = `/**
 * @color
 * @label Accent
 * @default #ff8800
 */
uniform vec3 u_accent;
/**
 * @range 0, 10
 * @default 4
 * @label Strength
 */
uniform float u_strength;
/** @time */
uniform float u_time;
/** @resolution */
uniform vec2 u_resolution;
/** @sdf */
uniform sampler2D u_sdf;`

describe('shader directive parsing', () => {
  test('directives above a uniform describe its input', () => {
    const parsed = parseShaderUniforms(PEN_EXAMPLE)
    expect(parsed.error).toBeNull()
    const [accent, strength, time, resolution, sdf] = parsed.uniforms
    expect(accent?.type).toBe('vec3')
    expect(accent?.kind).toBe('color')
    expect(accent?.components).toBe(3)
    expect(accent?.label).toBe('Accent')
    expect(accent?.default).toBe('#ff8800')
    expect(strength?.min).toBe(0)
    expect(strength?.max).toBe(10)
    expect(strength?.default).toBe(4)
    expect(time?.automatic).toBe('time')
    expect(time?.kind).toBe('number')
    expect(resolution?.automatic).toBe('resolution')
    expect(resolution?.components).toBe(2)
    expect(sdf?.automatic).toBe('sdf')
    expect(sdf?.kind).toBe('sampler')
    expect(sdf?.components).toBe(0)
  })

  test('a uniform without directives still declares an input', () => {
    const parsed = parseShaderUniforms('uniform vec2 u_grid;')
    expect(parsed.error).toBeNull()
    expect(parsed.uniforms.length).toBe(1)
    expect(parsed.uniforms[0]).toEqual({
      name: 'u_grid',
      type: 'vec2',
      kind: 'vector',
      components: 2
    })
  })

  test('a comment that is not right above the uniform declares nothing', () => {
    const source = `/** @time */
float scale = 1.0;
uniform float u_time;`
    const parsed = parseShaderUniforms(source)
    expect(parsed.error).toBeNull()
    expect(parsed.uniforms[0]?.label).toBeUndefined()
    expect(parsed.uniforms[0]?.automatic).toBeUndefined()
  })

  test('a comment declares nothing after the comment on the uniform above it', () => {
    const source = `/** @time */
uniform float u_time;
uniform float u_speed;`
    const parsed = parseShaderUniforms(source)
    expect(parsed.uniforms[0]?.automatic).toBe('time')
    expect(parsed.uniforms[1]?.automatic).toBeUndefined()
    expect(parsed.uniforms[1]?.default).toBeUndefined()
  })

  test('indented doc-comment lines are read', () => {
    const source = `/**
 * @mouse
 * @label Cursor
 * @default 0.5 0.5
 */
uniform vec2 u_mouse;`
    const parsed = parseShaderUniforms(source)
    expect(parsed.error).toBeNull()
    expect(parsed.uniforms[0]?.automatic).toBe('mouse')
    expect(parsed.uniforms[0]?.label).toBe('Cursor')
    expect(parsed.uniforms[0]?.default).toEqual([0.5, 0.5])
  })

  test('@min and @max set the range either way', () => {
    const source = `/** @min 0.25 */
uniform float u_low;
/** @min 4 @max 2 */
uniform float u_span;`
    const parsed = parseShaderUniforms(source)
    expect(parsed.error).toBeNull()
    expect(parsed.uniforms[0]?.min).toBe(0.25)
    expect(parsed.uniforms[0]?.max).toBeUndefined()
    expect(parsed.uniforms[1]?.min).toBe(2)
    expect(parsed.uniforms[1]?.max).toBe(4)
  })

  test('reversed ranges order their ends', () => {
    const parsed = parseShaderUniforms('/** @range 10, 0 */\nuniform int u_steps;')
    expect(parsed.error).toBeNull()
    expect(parsed.uniforms[0]?.min).toBe(0)
    expect(parsed.uniforms[0]?.max).toBe(10)
  })

  test('a boolean default is true or false', () => {
    const parsed = parseShaderUniforms('/** @default true */\nuniform bool u_flag;')
    expect(parsed.error).toBeNull()
    expect(parsed.uniforms[0]?.kind).toBe('boolean')
    expect(parsed.uniforms[0]?.default).toBe(true)

    const wrong = parseShaderUniforms('/** @default yes */\nuniform bool u_flag;')
    expect(wrong.error).toBe('A boolean default must be true or false')
  })

  test('wrong automatic types, duplicates, types, and arrays are reported', () => {
    expect(parseShaderUniforms('/** @time */\nuniform vec2 u_time;').error).toBe(
      '@time requires a float uniform, not vec2'
    )
    expect(
      parseShaderUniforms('/** @sdf */\nuniform sampler2D u_sdf;\nuniform sampler2D u_map;').error
    ).toBe('Sampler uniform u_map needs @sdf or @object; other textures are not supported')
    expect(parseShaderUniforms('/** @resolution */\nuniform vec2 u_resolution;').error).toBeNull()
    expect(
      parseShaderUniforms('uniform float u_x;\nuniform float u_x;').error
    ).toBe('Uniform u_x is declared more than once')
    expect(parseShaderUniforms('uniform vec5 u_x;').error).toBe('Unsupported uniform type vec5')
    expect(parseShaderUniforms('uniform vec3 u_x[2];').error).toBe('Array uniform u_x is not supported')
    expect(
      parseShaderUniforms('/** @object */\nuniform sampler2D a;\n/** @object */\nuniform sampler2D b;')
        .error
    ).toBe('A shader can have only one @object uniform')
    expect(
      parseShaderUniforms(
        '/** @sdf */\nuniform sampler2D sdf;\n/** @object */\nuniform sampler2D layer;'
      ).error
    ).toBe('An @object uniform must be the first sampler a shader declares')
    expect(
      parseShaderUniforms('/** @object */\nuniform sampler2D layer;\n/** @sdf */\nuniform sampler2D sdf;')
        .uniforms.map((uniform) => uniform.automatic)
    ).toEqual(['object', 'sdf'])
  })

  test('wrong defaults are reported', () => {
    expect(parseShaderUniforms('/** @default strong */\nuniform float u_x;').error).toBe(
      'A float default must be a number'
    )
    expect(parseShaderUniforms('/** @default 1 2 */\nuniform vec3 u_x;').error).toBe(
      'A vec3 default needs 3 numbers'
    )
    expect(
      parseShaderUniforms('/**\n @color\n @default green */\nuniform vec4 u_x;').error
    ).toBe('A color default must be a hex color')
    expect(
      parseShaderUniforms('/** @sdf @default #6ea8ff */\nuniform sampler2D u_sdf;').error
    ).toBe('A sampler uniform cannot have a default')
  })

  test('budgets reject a shader that is too large or has too many uniforms', () => {
    const many = Array.from(
      { length: SHADER_MAX_UNIFORMS + 1 },
      (_, index) => `uniform float u_${index};`
    ).join('\n')
    expect(parseShaderUniforms(many).error).toBe(
      `Shader declares ${SHADER_MAX_UNIFORMS + 1} uniforms; the limit is ${SHADER_MAX_UNIFORMS}`
    )

    const wide = Array.from({ length: 8 }, (_, index) => `uniform mat3 u_${index};`).join('\n')
    expect(parseShaderUniforms(wide).error).toBe(
      `Shader uniforms take ${8 * 9} floats; the limit is ${SHADER_MAX_UNIFORM_FLOATS}`
    )

    const bytes = ' '.repeat(SHADER_SOURCE_MAX_BYTES + 1) + 'uniform float u_one;'
    expect(parseShaderUniforms(bytes).error).toBe(
      `Shader source is ${new TextEncoder().encode(bytes).length} bytes; the limit is ${SHADER_SOURCE_MAX_BYTES}`
    )
  })

  test('a malformed declaration can still report the uniforms around it', () => {
    const source = `uniform float u_ok;
  uniform float u_bad
uniform vec2 u_also;`
    const parsed = parseShaderUniforms(source)
    expect(parsed.error).toBe('Cannot read uniform declaration: uniform float u_bad')
    expect(parsed.uniforms.map((uniform) => uniform.name)).toEqual(['u_ok', 'u_also'])
  })
})

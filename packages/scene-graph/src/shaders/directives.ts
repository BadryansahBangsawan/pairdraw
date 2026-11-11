/**
 * The inputs of a user shader, read from its GLSL declarations and the `@directive` comments above
 * them. The panel builds its controls from this list and the renderer packs its uniform array in
 * the same order, so the two cannot disagree.
 */

/** The largest shader source accepted, in UTF-8 bytes. */
export const SHADER_SOURCE_MAX_BYTES = 16 * 1024
/** The most uniforms one shader may declare. */
export const SHADER_MAX_UNIFORMS = 16
/** The most float components every uniform together may take. */
export const SHADER_MAX_UNIFORM_FLOATS = 64

export type ShaderUniformKind = 'number' | 'boolean' | 'color' | 'vector' | 'sampler'

/** A value a shader uniform holds: a number, a boolean, a hex color, or 2–4 numbers. */
export type ShaderUniformValue = number | boolean | string | readonly number[]

export type ShaderAutomaticInput = 'resolution' | 'time' | 'mouse' | 'sdf'

export interface ShaderUniform {
  name: string
  /** The declared GLSL type, such as `float` or `vec4`. */
  type: string
  kind: ShaderUniformKind
  /** How many floats the uniform takes in the runtime uniform array. */
  components: number
  label?: string
  default?: ShaderUniformValue
  min?: number
  max?: number
  /** Supplied by the renderer instead of stored in the document. */
  automatic?: ShaderAutomaticInput
}

export interface ShaderUniforms {
  uniforms: ShaderUniform[]
  /** The first problem that makes the shader unusable, or null. */
  error: string | null
}

const COMPONENTS: Readonly<Record<string, number>> = {
  float: 1,
  int: 1,
  bool: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,
  ivec2: 2,
  ivec3: 3,
  ivec4: 4,
  bvec2: 2,
  bvec3: 3,
  bvec4: 4,
  mat2: 4,
  mat3: 9,
  mat4: 16,
  sampler2D: 0
}

const BOOLEAN_TYPES: Readonly<Record<string, true>> = {
  bool: true,
  bvec2: true,
  bvec3: true,
  bvec4: true
}
const SAMPLER_TYPES: Readonly<Record<string, true>> = { sampler2D: true }

const DECLARATION = /^\s*uniform\s+(?:(?:highp|mediump|lowp)\s+)?([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*(\[[^\]]*\])?\s*;/u
const DIRECTIVE = /^@([A-Za-z_]\w*)\b([\s\S]*)$/u
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u

function kindOf(type: string): ShaderUniformKind {
  if (SAMPLER_TYPES[type] === true) return 'sampler'
  if (BOOLEAN_TYPES[type] === true) return 'boolean'
  if (type.startsWith('vec') || type.startsWith('ivec') || type.startsWith('bvec')) {
    return 'vector'
  }
  return 'number'
}

function uniformText(comment: string): string[] {
  return comment
    .replace(/^\/\*\*?/u, '')
    .replace(/\*\/$/u, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*?/u, '').trim())
    .filter((line) => line.length > 0)
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2 && trimmed[0] === trimmed[trimmed.length - 1]) {
    if (trimmed[0] === '"' || trimmed[0] === "'") return trimmed.slice(1, -1)
  }
  return trimmed
}

function numberValue(raw: string): number | null {
  const value = unquote(raw)
  if (!NUMBER.test(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function vectorValue(raw: string, components: number): number[] | null {
  const values = unquote(raw)
    .split(/[\s,]+/u)
    .filter((value) => value.length > 0)
    .map(Number)
  if (values.length !== components) return null
  return values.every((value) => Number.isFinite(value)) ? values : null
}

function defaultFor(
  uniform: Pick<ShaderUniform, 'type' | 'kind' | 'components'>,
  raw: string
): { value: ShaderUniformValue } | { error: string } {
  if (uniform.kind === 'sampler') return { error: 'A sampler uniform cannot have a default' }
  if (uniform.kind === 'color') {
    const value = unquote(raw).toLowerCase()
    return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/u.test(value)
      ? { value }
      : { error: 'A color default must be a hex color' }
  }
  if (uniform.type === 'bool') {
    const value = unquote(raw).toLowerCase()
    if (value === 'true' || value === 'false') return { value: value === 'true' }
    if (value === '1' || value === '0') return { value: value === '1' }
    return { error: 'A boolean default must be true or false' }
  }
  if (uniform.components > 1) {
    const value = vectorValue(raw, uniform.components)
    return value ? { value } : { error: `A ${uniform.type} default needs ${uniform.components} numbers` }
  }
  const value = numberValue(raw)
  return value === null ? { error: `A ${uniform.type} default must be a number` } : { value }
}

function automaticFor(
  name: string,
  uniform: ShaderUniform
): { automatic: ShaderAutomaticInput } | { error: string } {
  const type = uniform.type
  if (name === 'resolution' && type === 'vec2') return { automatic: 'resolution' }
  if (name === 'time' && type === 'float') return { automatic: 'time' }
  if (name === 'mouse' && type === 'vec2') return { automatic: 'mouse' }
  if (name === 'sdf' && type === 'sampler2D') return { automatic: 'sdf' }
  const expected =
    name === 'time' ? 'float' : name === 'sdf' ? 'sampler2D' : name === 'resolution' ? 'vec2' : 'vec2'
  return { error: `@${name} requires a ${expected} uniform, not ${type}` }
}

function applyDirective(
  uniform: ShaderUniform,
  name: string,
  rest: string
): { automatic: ShaderAutomaticInput } | { error: string } | null {
  const text = rest.trim()
  if (name === 'resolution' || name === 'time' || name === 'mouse' || name === 'sdf') {
    return automaticFor(name, uniform)
  }
  if (name === 'color') {
    uniform.kind = 'color'
    return null
  }
  if (name === 'label') {
    uniform.label = unquote(text)
    return null
  }
  if (name === 'default') {
    const parsed = defaultFor(uniform, text)
    if ('error' in parsed) return { error: parsed.error }
    uniform.default = parsed.value
    return null
  }
  if (name === 'min' || name === 'max') {
    const value = numberValue(text)
    if (value === null) return { error: `@${name} needs a number` }
    if (name === 'min') uniform.min = value
    else uniform.max = value
    return null
  }
  if (name === 'range') {
    const [minimum, maximum, extra] = text.split(/\s*,\s*|\s+/u).filter(Boolean)
    if (extra !== undefined) return { error: '@range needs a minimum and a maximum' }
    const low = minimum === undefined ? null : numberValue(minimum)
    const high = maximum === undefined ? null : numberValue(maximum)
    if (low === null || high === null) return { error: '@range needs a minimum and a maximum' }
    uniform.min = Math.min(low, high)
    uniform.max = Math.max(low, high)
    return null
  }
  return null
}

/**
 * Reads every uniform a shader declares, with the directives in the block comment above it.
 * A shader that breaks a budget, repeats a name, or uses a type v1 cannot pack returns `error`;
 * its uniforms are still returned so the panel can show what it understood.
 */
export function parseShaderUniforms(source: string): ShaderUniforms {
  const bytes = new TextEncoder().encode(source).length
  if (bytes > SHADER_SOURCE_MAX_BYTES) {
    return {
      uniforms: [],
      error: `Shader source is ${bytes} bytes; the limit is ${SHADER_SOURCE_MAX_BYTES}`
    }
  }

  const uniforms: ShaderUniform[] = []
  const names = new Set<string>()
  let error: string | null = null
  const fail = (message: string) => {
    error ??= message
  }

  const lines = source.split('\n')
  let comment: string | null = null
  let commentEnd = -1
  let inComment = false
  let commentStart = ''
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? ''
    if (inComment) {
      const end = line.indexOf('*/')
      if (end === -1) {
        commentStart += `${line}\n`
        continue
      }
      commentStart += line.slice(0, end)
      comment = commentStart
      commentEnd = index
      inComment = false
      commentStart = ''
      continue
    }
    const start = line.indexOf('/*')
    if (start !== -1) {
      const end = line.indexOf('*/', start + 2)
      if (end === -1) {
        inComment = true
        commentStart = line.slice(start) + '\n'
        continue
      }
      comment = line.slice(start, end + 2)
      commentEnd = index
      continue
    }
    if (line.trim().length === 0) continue

    const match = DECLARATION.exec(line)
    if (!match) {
      comment = null
      commentEnd = -1
      if (!line.trimStart().startsWith('uniform')) continue
      fail(`Cannot read uniform declaration: ${line.trim()}`)
      continue
    }

    const type = match[1] ?? ''
    const name = match[2] ?? ''
    if (match[3]) {
      fail(`Array uniform ${name} is not supported`)
      continue
    }
    const components = COMPONENTS[type]
    if (components === undefined) {
      fail(`Unsupported uniform type ${type}`)
      continue
    }
    const commentAbove = comment !== null && commentEnd === index - 1 ? comment : ''
    if (SAMPLER_TYPES[type] === true && !commentAbove.includes('@sdf')) {
      fail(`Sampler uniform ${name} needs @sdf; other textures are not supported`)
      continue
    }
    if (names.has(name)) {
      fail(`Uniform ${name} is declared more than once`)
      continue
    }

    const uniform: ShaderUniform = { name, type, kind: kindOf(type), components }
    const text = commentAbove
    let blocked = false
    for (const lineText of uniformText(text)) {
      for (const chunk of lineText.split(/(?=@[A-Za-z_])/u)) {
        const directive = DIRECTIVE.exec(chunk)
        if (!directive) continue
        const applied = applyDirective(uniform, directive[1] ?? '', directive[2] ?? '')
        if (applied && 'error' in applied) {
          fail(applied.error)
          blocked = true
          break
        }
        if (applied && 'automatic' in applied) uniform.automatic = applied.automatic
      }
      if (blocked) break
    }
    if (blocked) continue
    if (uniform.automatic && uniform.kind === 'sampler' && uniform.automatic !== 'sdf') {
      fail(`Sampler uniform ${name} can only be an SDF`)
      continue
    }
    if (
      uniform.min !== undefined &&
      uniform.max !== undefined &&
      uniform.min > uniform.max
    ) {
      [uniform.min, uniform.max] = [uniform.max, uniform.min]
    }
    names.add(name)
    comment = null
    commentEnd = -1
    uniforms.push(uniform)
  }

  if (error) return { uniforms, error }
  if (uniforms.length > SHADER_MAX_UNIFORMS) {
    return {
      uniforms,
      error: `Shader declares ${uniforms.length} uniforms; the limit is ${SHADER_MAX_UNIFORMS}`
    }
  }
  const floats = uniforms.reduce((total, uniform) => total + uniform.components, 0)
  if (floats > SHADER_MAX_UNIFORM_FLOATS) {
    return {
      uniforms,
      error: `Shader uniforms take ${floats} floats; the limit is ${SHADER_MAX_UNIFORM_FLOATS}`
    }
  }
  if (uniforms.filter((uniform) => uniform.automatic === 'sdf').length > 1) {
    return { uniforms, error: 'A shader can have only one @sdf uniform' }
  }
  return { uniforms, error: null }
}


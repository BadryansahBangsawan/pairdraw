/**
 * Turns the GLSL a designer writes, as pen.dev compiles it, into the SkSL a CanvasKit runtime
 * effect compiles. Only a WebGL1 fragment shader translates: one `main`, `gl_FragCoord`,
 * `gl_FragColor`, and `texture2D` over the shape's SDF. Anything else is left for SkSL to reject,
 * and its error reaches the panel.
 */

import type { ShaderAutomaticInput } from '@open-pencil/scene-graph/shaders'

/** One translated shader, or the reason it cannot be translated. */
export interface ShaderTranslation {
  sksl: string
  error: string | null
}

/** How many shader coordinates one SDF texel spans, as `@sdf` frames are made this size square. */
const SDF_SIZE = 128

/** The uniform the entry point flips y about, which keeps GLSL's y-up coordinates: frame height. */
export const FRAME_HEIGHT_UNIFORM = 'u_ompFrameHeight'

/**
 * The frame size the translator supplies so an `@object` sample maps a uv to the layer's own
 * pixels, which is what an effect's snapshot texture spans.
 */
export const OBJECT_SIZE_UNIFORM = 'u_ompFrameSize'

/**
 * GLSL declarations SkSL spells differently. A `sampler2D` uniform is a child shader, and its
 * coordinates are sampled at the SDF's own scale.
 */
function rewriteTypes(text: string): string {
  return text
    .replace(/\bvec([234])\b/g, 'float$1')
    .replace(/\bivec([234])\b/g, 'int$1')
    .replace(/\bbvec([234])\b/g, 'bool$1')
    .replace(/\bmat([234])\b/g, 'float$1x$1')
    .replace(/\bsampler2D\b/g, 'shader')
}

/** Drops the preprocessor and precision lines, which GLSL needs and SkSL does not read. */
function stripDirectives(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trimStart()
      return !trimmed.startsWith('#') && !trimmed.startsWith('precision ')
    })
    .join('\n')
}

/** The index just past the `)` that closes the `(` at `open`, or -1 when it never closes. */
function closingParen(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index++) {
    const char = text[index]
    if (char === '(') depth++
    else if (char === ')') {
      depth--
      if (depth === 0) return index + 1
    }
  }
  return -1
}

/** The top-level `,` of a call's arguments, splitting `read` between two expressions. */
function splitArguments(body: string): [string, string] | null {
  let depth = 0
  for (let index = 0; index < body.length; index++) {
    const char = body[index]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) {
      return [body.slice(0, index), body.slice(index + 1)]
    }
  }
  return null
}

/**
 * Rewrites every `texture2D(sampler, coordinates)` into a child-shader sample. SkSL child shaders
 * take coordinates in the child's own pixels, so a uv coordinate scales to the child texture's
 * size; `sizes` holds that scale as a SkSL expression per sampler name.
 */
function rewriteSamples(text: string, sizes: Readonly<Record<string, string>>): string {
  let output = ''
  let at = 0
  for (;;) {
    const start = text.indexOf('texture2D', at)
    if (start === -1) return output + text.slice(at)
    const open = text.indexOf('(', start)
    if (open === -1) return output + text.slice(at)
    const close = closingParen(text, open)
    if (close === -1) return output + text.slice(at)
    const args = splitArguments(text.slice(open + 1, close - 1))
    output += text.slice(at, start)
    if (!args) {
      output += text.slice(start, close)
    } else {
      const sampler = args[0].trim()
      const coordinates = args[1].trim()
      const scale = sizes[sampler] ?? `${SDF_SIZE}.0`
      output += `float4(${sampler}.eval((${coordinates}) * ${scale}))`
    }
    at = close
  }
}

/**
 * `source` as SkSL, or why it cannot be. The user's `main` becomes `userMain`, and a generated
 * entry point gives it the frame coordinate and returns the colour it wrote. GLSL's `gl_FragCoord`
 * counts y up from the bottom, while the canvas counts it down, so the entry point flips y about
 * the frame height, which the renderer supplies as `u_ompFrameHeight`.
 */
export function translateShader(
  source: string,
  samplerKinds: Readonly<Record<string, ShaderAutomaticInput | undefined>> = {}
): ShaderTranslation {
  let text = stripDirectives(source)
  if (!/void\s+main\s*\(\s*\)/.test(text)) {
    return { sksl: '', error: 'A shader must define `void main()`' }
  }

  const sizes: Record<string, string> = {}
  let object = false
  for (const [name, kind] of Object.entries(samplerKinds)) {
    if (kind !== 'object') continue
    sizes[name] = OBJECT_SIZE_UNIFORM
    object = true
  }

  text = rewriteTypes(text)
  text = rewriteSamples(text, sizes)
  text = text.replace(/\bgl_FragCoord\b/g, 'u_fragCoord')
  text = text.replace(/\bgl_FragColor\b/g, 'u_fragColor')
  text = text.replace(/void\s+main\s*\(\s*\)/, 'void userMain(float2 u_fragCoord)')

  const frameSize = object ? `uniform float2 ${OBJECT_SIZE_UNIFORM};\n` : ''
  const sksl = `uniform float ${FRAME_HEIGHT_UNIFORM};
${frameSize}float4 u_fragColor = float4(0.0);
${text}
half4 main(float2 u_fragCoord) {
  userMain(float2(u_fragCoord.x, ${FRAME_HEIGHT_UNIFORM} - u_fragCoord.y));
  return half4(u_fragColor);
}`
  return { sksl, error: null }
}

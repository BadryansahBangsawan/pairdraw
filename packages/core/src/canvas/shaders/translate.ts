/**
 * Turns the GLSL a designer writes, as pen.dev compiles it, into the SkSL a CanvasKit runtime
 * effect compiles. Only a WebGL1 fragment shader translates: one `main`, `gl_FragCoord`,
 * `gl_FragColor`, and `texture2D` over the shape's SDF. Anything else is left for SkSL to reject,
 * and its error reaches the panel.
 */

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
 * Rewrites every `texture2D(sampler, coordinates)` into an SDF sample. SkSL child shaders take
 * coordinates in the child's own pixels, and the frame is `SDF_SIZE` square, so a uv coordinate
 * scales to it.
 */
function rewriteSamples(text: string): string {
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
      output += `float4(${sampler}.eval((${coordinates}) * ${SDF_SIZE}.0))`
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
export function translateShader(source: string): ShaderTranslation {
  let text = stripDirectives(source)
  if (!/void\s+main\s*\(\s*\)/.test(text)) {
    return { sksl: '', error: 'A shader must define `void main()`' }
  }

  text = rewriteTypes(text)
  text = rewriteSamples(text)
  text = text.replace(/\bgl_FragCoord\b/g, 'u_fragCoord')
  text = text.replace(/\bgl_FragColor\b/g, 'u_fragColor')
  text = text.replace(/void\s+main\s*\(\s*\)/, 'void userMain(float2 u_fragCoord)')

  const sksl = `uniform float ${FRAME_HEIGHT_UNIFORM};
float4 u_fragColor = float4(0.0);
${text}
half4 main(float2 u_fragCoord) {
  userMain(float2(u_fragCoord.x, ${FRAME_HEIGHT_UNIFORM} - u_fragCoord.y));
  return half4(u_fragColor);
}`
  return { sksl, error: null }
}

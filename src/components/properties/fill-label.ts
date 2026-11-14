import type { Fill, Variable } from '@pairdraw/scene-graph'
import { colorToHexRaw } from '@pairdraw/scene-graph/color'
import { isShaderPresetPaint, type ShaderPaint } from '@pairdraw/scene-graph/shaders'
import { shaderEffectLabel } from '@pairdraw/vue/controls/shader'

export function fillLabel(
  fill: Fill,
  boundVariable?: Variable,
  shader?: ShaderPaint | null,
  /** What names a paint that draws code the user wrote, which has no effects to name. */
  codeLabel: string = fill.type
): string {
  if (boundVariable) return boundVariable.name
  if (shader) {
    // A preset is named by its effects, top first, as its picker lists them; code by itself.
    if (!isShaderPresetPaint(shader)) return codeLabel
    return shader.preset.components
      .map((component) => shaderEffectLabel(component.type))
      .reverse()
      .join(', ')
  }
  if (fill.type === 'SOLID') return colorToHexRaw(fill.color)
  if (fill.type.startsWith('GRADIENT')) return fill.type.replace('GRADIENT_', '')
  return fill.type
}

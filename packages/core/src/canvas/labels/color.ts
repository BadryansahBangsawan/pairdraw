import { compositeOver, readableForeground } from '@pairdraw/scene-graph/color'
import { WHITE } from '@pairdraw/scene-graph/constants'
import type { Color } from '@pairdraw/scene-graph/primitives'

export function canvasLabelForeground(background: Color, canvasBackground: Color = WHITE): Color {
  return readableForeground(compositeOver(background, canvasBackground))
}

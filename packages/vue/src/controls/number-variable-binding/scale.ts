import type { TextLength } from '@pairdraw/scene-graph'

/**
 * A field may show a number in other units than the layer stores it, such as opacity 0.5 shown
 * as 50%. A variable holds the stored value, which a binding applies unscaled.
 */
export function storedNumberFromDisplay(display: number, displayScale = 1): number {
  return display / displayScale
}

/** The number a field shows for a stored value, such as 50 for an opacity of 0.5. */
export function displayNumberFromStored(stored: number, displayScale = 1): number {
  return stored * displayScale
}

/**
 * The number a variable created from a line height or letter spacing field holds: the pixels the
 * field shows, where a percent is of `fontSize`. A bound length applies as pixels, as Figma's
 * does, so binding it keeps the text as it was and the field then reads pixels. The percent
 * converts as `display * fontSize / 100`, which keeps decimal results such as 16.8 exact.
 */
export function textLengthVariableValue(
  display: number,
  unit: TextLength['unit'],
  fontSize: number
): number {
  return unit === 'PERCENT' ? (display * fontSize) / 100 : display
}

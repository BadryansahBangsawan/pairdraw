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

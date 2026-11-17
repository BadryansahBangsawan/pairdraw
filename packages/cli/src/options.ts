/** A numeric option inside its documented range, refusing one the format cannot honour. */
export function numberInRange(flag: string, value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`--${flag} must be between ${min} and ${max}`)
  }
  return value
}

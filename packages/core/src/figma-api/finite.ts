/** Figma's refusal for a value a plugin setter cannot take, worded as its own setters do. */
export function invalidSetterValue(method: string, property: string, problem: string): Error {
  return new Error(`in ${method}: Property "${property}" failed validation: ${problem}`)
}

/**
 * A number a layer field takes. NaN and Infinity would break the layer's bounds and its page's,
 * so a setter refuses them with Figma's message instead of writing them.
 */
export function finiteNumber(value: unknown, property: string, method = `set_${property}`): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw invalidSetterValue(method, property, `Expected number, received ${String(value)}`)
  return value
}

/** A number that may also be absent, as a minimum or maximum size is. */
export function finiteOrNull(
  value: unknown,
  property: string,
  method = `set_${property}`
): number | null {
  return value === null ? null : finiteNumber(value, property, method)
}

/** Figma grows a layer to fill its auto layout with 1 and keeps its size with 0. */
export function layoutGrowChoice(value: unknown): 0 | 1 {
  if (value !== 0 && value !== 1)
    throw invalidSetterValue(
      'set_layoutGrow',
      'layoutGrow',
      'Expected one of the following, but none matched:\n  Invalid input: expected 0\n  Invalid input: expected 1'
    )
  return value
}

/** A dash pattern's numbers, refused one by one with the index Figma reports. */
export function dashPatternValues(
  value: unknown,
  method = 'set_dashPattern',
  property = 'dashPattern'
): number[] {
  if (!Array.isArray(value))
    throw invalidSetterValue(
      method,
      property,
      `Expected array, received ${value === null ? 'null' : typeof value}`
    )
  return value.map((dash, index) => {
    if (typeof dash !== 'number' || !Number.isFinite(dash))
      throw invalidSetterValue(
        method,
        property,
        `Expected number, received ${String(dash)} at index ${index}`
      )
    return dash
  })
}

export interface TransformRows {
  first: [number, number, number]
  second: [number, number, number]
}

function isIndexedObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** A row or the pair of rows, given as an array or as an object keyed by index. */
function indexedValues(value: unknown, length: number): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!isIndexedObject(value)) return null
  return Array.from({ length }, (_, index) => value[String(index)])
}

/**
 * Figma takes a relative transform as two rows of three numbers, each row and the pair given as an
 * array or as an object keyed by index. Both are read here, with the path of a wrong value in the
 * message.
 */
export function finiteTransform(
  value: unknown,
  method = 'set_relativeTransform',
  property = 'relativeTransform'
): TransformRows {
  const rows = indexedValues(value, 2)
  if (!rows) throw invalidSetterValue(method, property, 'Expected an array of 2 rows')
  const read = (row: unknown, index: number): [number, number, number] => {
    const cells = indexedValues(row, 3)
    if (!cells) throw invalidSetterValue(method, property, `Expected an array of 3 at [${index}]`)
    const numbers = cells.map((cell, cellIndex) => {
      if (typeof cell !== 'number' || !Number.isFinite(cell))
        throw invalidSetterValue(
          method,
          property,
          `Expected number, received ${String(cell)} at [${index}][${cellIndex}]`
        )
      return cell
    })
    return [numbers[0], numbers[1], numbers[2]]
  }
  return { first: read(rows[0], 0), second: read(rows[1], 1) }
}

/**
 * CSS length shorthand for tool setters: `padding: 16px 24px`, `gap: 12px 4px`, `radius: 8px 8px 0 0`.
 * The parser is the one place a shorthand string becomes numbers, so a setter can refuse bad input
 * before it touches a node.
 */
import { compact } from 'es-toolkit/array'
import * as v from 'valibot'

export type LengthShorthand = number | string

/** How many lengths a field reads; the result always has four, in CSS order. */
export type LengthSlots = 1 | 2 | 4

const LENGTH = /^(-?\d+(?:\.\d+)?)(?:px)?$/

function expand(values: number[], slots: LengthSlots): number[] {
  const [first = 0, second = first] = values
  if (slots === 1) return [first]
  if (slots === 2) return [first, second]
  const [, , third = first, fourth = second] = values
  return [first, second, third, fourth]
}

/**
 * Four lengths in CSS order (top right bottom left, or the four corners), or an `error` naming the
 * field so the caller can return it as the tool's refusal.
 */
export function parseLengthShorthand(
  value: LengthShorthand,
  slots: LengthSlots,
  field: string
): number[] | { error: string } {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { error: `"${field}" expects a finite number` }
    if (value < 0) return { error: `"${field}" must not be negative` }
    return expand([value], slots)
  }

  const parts = compact(value.trim().split(/\s+/))
  if (parts.length === 0) return { error: `"${field}" expects at least one length` }
  if (parts.length > slots) {
    return { error: `"${field}" takes 1 to ${slots} lengths, got ${parts.length}` }
  }

  const numbers: number[] = []
  for (const part of parts) {
    const match = LENGTH.exec(part)
    if (!match) return { error: `"${field}" expects px lengths, got "${part}"` }
    numbers.push(Number(match[1]))
  }
  if (numbers.some((value) => value < 0)) return { error: `"${field}" must not be negative` }
  return expand(numbers, slots)
}

/**
 * A tool input that takes a length or the CSS shorthand for one: the parser decides what the
 * string means, so the schema only has to accept it.
 */
export function lengthShorthandInput(description: string) {
  return v.union([
    v.pipe(v.number(), v.minValue(0), v.maxValue(Number.MAX_VALUE), v.description(description)),
    v.pipe(v.string(), v.description(description))
  ])
}

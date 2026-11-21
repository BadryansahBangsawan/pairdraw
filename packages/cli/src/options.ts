import { stat } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'

import { printError } from '#cli/format'

/** A numeric option inside its documented range, refusing one the format cannot honour. */
export function numberInRange(flag: string, value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`--${flag} must be between ${min} and ${max}`)
  }
  return value
}

/** A whole-number option at least `min`, or the message that refuses the value. */
export function integerOptionError(flag: string, value: string, min: number): string | undefined {
  const number = Number(value)
  if (Number.isInteger(number) && number >= min) return undefined
  const kind = min === 0 ? 'a non-negative integer' : 'a positive integer'
  return `--${flag} must be ${kind}, got "${value}"`
}

/** A whole-number option at least `min`, exiting with the message that refuses the value. */
export function requireIntegerOption(flag: string, value: string, min: number): number {
  const error = integerOptionError(flag, value, min)
  if (error) {
    printError(error)
    process.exit(1)
  }
  return Number(value)
}

/** The directory an output path writes into, refused before the work that would produce it. */
export async function requireOutputDirectory(path: string): Promise<void> {
  const parent = dirname(path)
  const info = await stat(parent).catch(() => undefined)
  if (!info?.isDirectory()) throw new Error(`Cannot write ${path}: ${parent} is not a directory`)
}

/**
 * An output path that is not the input file: a default named after the input, as `export -f fig`
 * and a same-format `convert` produce, would otherwise write the document over its own source.
 */
export function outputBesideInput(output: string, input: string): string {
  if (resolve(output) !== resolve(input)) return output
  const extension = extname(output)
  const base = basename(output, extension)
  return join(dirname(output), `${base}-export${extension}`)
}

import { stat } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'

/** A numeric option inside its documented range, refusing one the format cannot honour. */
export function numberInRange(flag: string, value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`--${flag} must be between ${min} and ${max}`)
  }
  return value
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

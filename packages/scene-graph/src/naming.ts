/**
 * `name`, or the first of `name 2`, `name 3`… that `taken` does not hold, as Figma names a copy
 * of a collection, a style, or a property beside one of the same name.
 */
export function numberedName(name: string, taken: Iterable<string>): string {
  const names = new Set(taken)
  if (!names.has(name)) return name
  let index = 2
  while (names.has(`${name} ${index}`)) index++
  return `${name} ${index}`
}

/**
 * The value a style or attribute record sets for `key`, or undefined when it sets none. Records
 * are typed as setting every key, which they do not.
 */
export function ownValue(
  record: Readonly<Record<string, string>>,
  key: string
): string | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

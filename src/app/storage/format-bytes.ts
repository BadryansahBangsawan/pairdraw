/**
 * Human-readable byte size (e.g. 1.2 MB), its number written as the interface language writes
 * numbers: German reads 1,5 KB where English reads 1.5 KB.
 */
export function formatStorageBytes(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes < 1024) {
    return `${new Intl.NumberFormat(locale, { useGrouping: false }).format(Math.round(bytes))} B`
  }
  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  const number = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value)
  return `${number} ${units[unitIndex]}`
}

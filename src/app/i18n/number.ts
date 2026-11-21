import { locale } from '@pairdraw/vue/i18n'

const numberFormats = new Map<string, Intl.NumberFormat>()

/** Numbers follow the app's language, not the browser's, like the rest of the interface. */
export function formatNumber(value: number): string {
  const language = locale.get()
  let format = numberFormats.get(language)
  if (!format) {
    format = new Intl.NumberFormat(language, { maximumFractionDigits: 2 })
    numberFormats.set(language, format)
  }
  return format.format(value)
}

const compactNumberFormats = new Map<string, Intl.NumberFormat>()

/** A large count in short form, as the context meter shows tokens: 12.3K, 1.2M. */
export function formatCompactNumber(value: number): string {
  const language = locale.get()
  let format = compactNumberFormats.get(language)
  if (!format) {
    format = new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 })
    compactNumberFormats.set(language, format)
  }
  return format.format(value)
}

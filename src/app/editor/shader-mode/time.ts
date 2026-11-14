import { locale } from '@pairdraw/vue/i18n'

const formats = new Map<string, Intl.NumberFormat>()

/** A time in Shader Mode's loop, such as “2.4 s”, to a tenth of a second in the app's language. */
export function formatShaderTime(seconds: number): string {
  const language = locale.get()
  let format = formats.get(language)
  if (!format) {
    format = new Intl.NumberFormat(language, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'short',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })
    formats.set(language, format)
  }
  return format.format(Number.isFinite(seconds) ? Math.max(seconds, 0) : 0)
}

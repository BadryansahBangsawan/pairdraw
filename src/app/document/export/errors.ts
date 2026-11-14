import { codeMessages } from '@pairdraw/vue/i18n'

type ExportErrorKey = 'exportNothing' | 'exportSinglePage'

/**
 * The errors Core's export formats throw that a person can cause, by the message each throws,
 * with the message that says it in the app's language.
 */
const CORE_EXPORT_ERRORS = new Map<string, ExportErrorKey>([
  ['Nothing to export', 'exportNothing'],
  ['Export selection must stay on a single page', 'exportSinglePage'],
  ['Raster export selection must stay on a single page', 'exportSinglePage']
])

/**
 * Why an export failed, for the notice that reports it: a known Core export error in the app's
 * language, and any other error in its own words.
 */
export function exportErrorDetail(
  error: unknown,
  messages: Record<ExportErrorKey, string> = codeMessages.get()
): string {
  const raw = error instanceof Error ? error.message : String(error)
  const key = CORE_EXPORT_ERRORS.get(raw)
  return key ? messages[key] : raw
}

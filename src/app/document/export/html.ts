import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import * as v from 'valibot'
import { computed, ref } from 'vue'

import { IS_BROWSER } from '@open-pencil/core/constants'
import type { HTMLExportOptions } from '@open-pencil/core/io'
import type { TailwindStylesheetId } from '@open-pencil/dom-css/export'

import type { HTMLExportSettings } from '@/app/document/export/types'

const htmlExportSettingsSchema = v.object({
  html: v.picklist(['fragment', 'standalone']),
  style: v.picklist(['inline', 'tailwind']),
  assets: v.picklist(['inline', 'external']),
  layerNames: v.boolean(),
  layerIds: v.boolean()
})

/**
 * A whole page with its images embedded, layer names written as `data-name` and IDs left out,
 * as pen.dev exports HTML.
 */
export const DEFAULT_HTML_EXPORT_SETTINGS: HTMLExportSettings = {
  html: 'standalone',
  style: 'inline',
  assets: 'inline',
  layerNames: true,
  layerIds: false
}

const stored = !IS_BROWSER
  ? ref<unknown>(null)
  : useLocalStorage<unknown>('open-pencil:html-export', null, {
      serializer: StorageSerializers.object,
      writeDefaults: false
    })

/** The settings HTML exports use, remembered across sessions on this device. */
export const htmlExportSettings = computed<HTMLExportSettings>({
  get() {
    const parsed = v.safeParse(htmlExportSettingsSchema, stored.value)
    return parsed.success ? parsed.output : DEFAULT_HTML_EXPORT_SETTINGS
  },
  set(settings) {
    stored.value = settings
  }
})

/** Tailwind's stylesheets, loaded with the first standalone Tailwind export, not with the app. */
export async function loadTailwindStylesheet(id: TailwindStylesheetId): Promise<string> {
  if (id === 'tailwindcss/theme.css') return (await import('tailwindcss/theme.css?raw')).default
  return (await import('tailwindcss/utilities.css?raw')).default
}

/**
 * The options Core's HTML format takes for `settings`. A standalone page with separate files
 * ships its web fonts beside its images.
 */
export function htmlExportOptions(settings: HTMLExportSettings): HTMLExportOptions {
  return {
    ...settings,
    fonts: settings.html === 'standalone' && settings.assets === 'external' ? 'assets' : 'none',
    loadTailwindStylesheet
  }
}

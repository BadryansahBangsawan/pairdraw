import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import { computed, watchEffect } from 'vue'

import {
  DEFAULT_THEME,
  resolveAppTheme,
  THEME_STORAGE_KEY,
  type AppTheme
} from '@/app/settings/theme'

const setting = useLocalStorage<AppTheme>(THEME_STORAGE_KEY, DEFAULT_THEME, {
  writeDefaults: false
})
const prefersDark = usePreferredDark()

/**
 * The theme the portal's pages show, for art drawn once per theme, such as the brand mark in
 * their bars.
 */
export const portalAppearance = computed(() => resolveAppTheme(setting.value, prefersDark.value))

/**
 * Takes the editor's theme, which a Cloud server's pages share with the editor it serves from the
 * same address, so the boot splash and the page keep the editor's colours. Elsewhere, as for the
 * metrics dashboard, no theme is stored and the editor's default applies. The editor's accent
 * stays the editor's; the stylesheet's default accent applies.
 */
export function usePortalTheme(): void {
  watchEffect(() => {
    const value = portalAppearance.value
    document.documentElement.dataset.theme = value
    document.documentElement.style.colorScheme = value
  })
}

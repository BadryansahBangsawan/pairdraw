import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'

import {
  iconPackagesFor,
  isIconPackage,
  type IconFramework,
  type IconPackage
} from '@open-pencil/dom-css/export'

const stored = useLocalStorage<string>('open-pencil:code-icon-package', 'iconify')

/** Where generated Vue and React components take icons from, remembered across sessions. */
export const codeIconPackage = computed<IconPackage>({
  get: () => (isIconPackage(stored.value) ? stored.value : 'iconify'),
  set: (value) => {
    stored.value = value
  }
})

/**
 * The package `framework`'s components take icons from: the remembered one when it draws that
 * framework's icons, Iconify otherwise, as React Icons is for React alone.
 */
export function iconPackageFor(framework: IconFramework): IconPackage {
  const chosen = codeIconPackage.value
  return iconPackagesFor(framework).includes(chosen) ? chosen : 'iconify'
}

/** The packages by their own names, which no locale translates. */
export const ICON_PACKAGE_LABELS: Record<IconPackage, string> = {
  iconify: 'Iconify',
  lucide: 'Lucide',
  heroicons: 'Heroicons',
  'react-icons': 'React Icons',
  fontawesome: 'Font Awesome'
}

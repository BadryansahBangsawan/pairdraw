import { useLocalStorage } from '@vueuse/core'
import { computed } from 'vue'

import { COMPONENT_STYLINGS, type ComponentStyling } from '@pairdraw/dom-css/export'

const stored = useLocalStorage<string>('pairdraw:code-styling', 'css')

function isStyling(value: string): value is ComponentStyling {
  return COMPONENT_STYLINGS.some((styling) => styling === value)
}

/** How the Code tab styles generated HTML and components, remembered across sessions. */
export const codeStyling = computed<ComponentStyling>({
  get: () => (isStyling(stored.value) ? stored.value : 'css'),
  set: (value) => {
    stored.value = value
  }
})

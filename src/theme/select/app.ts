import { panelField } from '@/theme/control'

import selectTheme from './select'

const appSelectTheme = {
  slots: {
    ...selectTheme.slots,
    trigger: [selectTheme.slots.trigger, 'w-full min-w-0']
  },
  variants: {
    ...selectTheme.variants,
    /**
     * The control scale in `theme/control.ts`, with the padding and text of an input that size.
     * `xs`, the default, is the property field (`panelField`), one step taller than an xs button.
     */
    size: {
      xs: { trigger: [panelField.height, 'px-2', panelField.text] },
      sm: { trigger: 'h-7 px-2.5 text-xs' },
      md: { trigger: 'h-8 px-3 text-xs' },
      lg: { trigger: 'h-9 px-3 text-sm' }
    }
  },
  defaultVariants: { ...selectTheme.defaultVariants, size: 'xs' as const }
}

export type AppSelectTheme = typeof appSelectTheme
export default appSelectTheme

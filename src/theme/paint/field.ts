import { panelFieldBase } from '@/theme/panel/field/base'

/** A paint's swatch, value, and opacity in one property field. */
export default {
  slots: {
    root: [panelFieldBase, 'flex flex-1 items-center overflow-hidden text-xs transition-colors'],
    preview: 'flex shrink-0 items-center pl-1.5',
    value: 'flex min-w-0 flex-1 items-center pl-1.5 pr-1',
    divider: 'h-4 w-px shrink-0 bg-muted/40',
    opacity: 'h-full w-15 flex-none shrink-0',
    binding: 'flex shrink-0 items-center pr-0.5'
  }
} as const

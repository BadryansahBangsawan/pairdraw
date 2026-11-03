import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

/** The chat header's context-window meter and the breakdown it opens. */
export default {
  slots: {
    trigger:
      'flex h-7 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-[11px] text-muted tabular-nums outline-none hover:bg-hover hover:text-surface focus-visible:ring-2 focus-visible:ring-accent/50',
    bar: 'w-6',
    icon: 'size-3.5 shrink-0',
    /** The bar's fill, which turns to the warning and error colours as the context fills. */
    fill: '',
    content: ['z-50 w-72 max-w-[calc(100vw-1rem)] p-3', floatingSurface, motionStyles.floating],
    heading: 'text-xs font-medium text-surface',
    figure: 'mt-1 text-xs text-surface tabular-nums',
    progress: 'mt-2',
    note: 'mt-1 text-[11px] leading-relaxed text-muted',
    rows: 'mt-3 space-y-1 border-t border-border pt-2',
    row: 'flex items-center justify-between gap-3 text-[11px]',
    rowLabel: 'text-muted',
    rowValue: 'text-surface tabular-nums',
    alert: 'mt-3'
  },
  variants: {
    level: {
      normal: {},
      warning: { trigger: 'text-warning', fill: 'bg-warning' },
      full: { trigger: 'text-error', fill: 'bg-error-fill' }
    }
  },
  defaultVariants: { level: 'normal' as const }
} as const

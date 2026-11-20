import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

/** The chat's token and cost meter: a quiet figure that opens the breakdown it counted. */
export default {
  slots: {
    trigger:
      'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted tabular-nums outline-none hover:bg-hover hover:text-surface focus-visible:ring-2 focus-visible:ring-accent/50',
    icon: 'size-3 shrink-0',
    content: ['z-50 w-64 max-w-[calc(100vw-1rem)] p-3', floatingSurface, motionStyles.floating],
    heading: 'text-xs font-medium text-surface',
    figure: 'mt-1 text-xs text-surface tabular-nums',
    note: 'mt-1 text-[11px] leading-relaxed text-muted',
    rows: 'mt-3 space-y-1 border-t border-border pt-2',
    row: 'flex items-center justify-between gap-3 text-[11px]',
    rowLabel: 'text-muted',
    rowValue: 'text-surface tabular-nums',
    cost: 'text-surface tabular-nums'
  }
} as const

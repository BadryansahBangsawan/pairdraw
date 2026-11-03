import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

/** The chat header's pinned context: the style kit and reference images of a conversation. */
export default {
  slots: {
    trigger: 'relative',
    icon: 'size-3.5 shrink-0',
    count:
      'pointer-events-none absolute -top-0.5 -right-0.5 min-w-3.5 rounded-full bg-accent px-0.5 text-center text-[9px] leading-3.5 font-medium text-on-accent tabular-nums',
    content: ['z-50 w-80 max-w-[calc(100vw-1rem)] p-3', floatingSurface, motionStyles.floating],
    heading: 'text-xs font-medium text-surface',
    description: 'mt-0.5 text-[11px] leading-relaxed text-muted',
    section: 'mt-3 space-y-2 border-t border-border pt-3',
    sectionHeader: 'flex items-center justify-between gap-2',
    sectionTitle: 'text-xs font-medium text-surface',
    empty: 'text-[11px] text-muted',
    kit: 'space-y-1.5 rounded-lg border border-border p-2',
    kitHeader: 'flex items-center gap-1',
    kitName: 'min-w-0 flex-1 truncate text-xs font-medium text-surface',
    swatches: 'flex flex-wrap gap-1',
    swatch: 'size-4 rounded-sm ring-1 ring-border',
    swatchLabel: 'sr-only',
    kitDetail: 'truncate text-[11px] text-muted',
    references: 'grid grid-cols-4 gap-1.5',
    reference:
      'group/reference relative aspect-square overflow-hidden rounded-lg border border-border bg-panel-secondary',
    referenceImage: 'size-full object-cover',
    referenceRemove:
      'absolute top-0.5 right-0.5 bg-panel/90 opacity-0 group-focus-within/reference:opacity-100 group-hover/reference:opacity-100 pointer-coarse:opacity-100',
    pending:
      'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border p-1 text-center text-[10px] leading-tight text-muted',
    pendingName: 'line-clamp-2 break-all',
    hint: 'text-[11px] text-muted',
    alert: 'mt-3'
  }
} as const

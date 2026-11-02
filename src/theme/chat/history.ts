import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

/**
 * The chat card's header, as tall as the top bar: the conversation's title, which opens its
 * history, and the actions on it.
 */
export default {
  slots: {
    root: 'shrink-0 border-b border-border',
    header: 'flex h-11 min-w-0 items-center gap-1 px-2',
    trigger:
      'flex min-w-0 flex-1 items-center gap-1 rounded-lg px-1.5 py-1 text-left text-xs font-medium text-surface hover:bg-hover disabled:opacity-50',
    title: 'min-w-0 flex-1 truncate',
    icon: 'size-3.5 shrink-0',
    content: ['z-50 w-80 max-w-[calc(100vw-1rem)] p-2', floatingSurface, motionStyles.floating],
    input:
      'h-7 w-full rounded-field border border-transparent bg-panel-field px-2 text-xs text-surface outline-none placeholder:text-muted hover:bg-panel-field-hover focus:border-panel-focus',
    // This document or all of them, as a segmented control.
    scope: 'my-2 flex gap-0.5 rounded-lg bg-panel-field p-0.5',
    scopeButton:
      'flex-1 rounded-md px-2 py-1 text-[11px] text-muted hover:text-surface data-[active=true]:bg-raised data-[active=true]:text-surface data-[active=true]:shadow-xs',
    list: 'max-h-64 space-y-0.5 overflow-y-auto',
    row: 'group/row flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-surface hover:bg-hover focus-visible:outline-panel-focus data-[selected=true]:bg-panel-selected-muted',
    // On the selected row's accent tint the muted color falls short of 4.5:1.
    detail: 'block truncate text-[10px] text-muted group-data-[selected=true]/row:text-surface',
    label: 'block truncate text-xs',
    empty: 'px-2 py-4 text-center text-xs text-muted',
    form: 'space-y-2 border-t border-border p-2',
    actions: 'flex justify-end gap-1'
  }
} as const

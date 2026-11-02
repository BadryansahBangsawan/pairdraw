/**
 * Tabs across the top of the right panel: a segmented control whose active tab is a raised pill.
 * Text tabs share the track; icon tabs, such as Lint, keep to their icon and name themselves to
 * screen readers. A tab with an icon and a label drops the label when the track runs out of room.
 * The track clips horizontally rather than scrolls, so focusing a control never shifts the panel.
 */
export default {
  slots: {
    list: '@container/tabs flex min-w-0 items-center gap-0.5 overflow-x-clip rounded-field bg-panel-field p-0.5',
    trigger:
      'relative flex h-6 min-w-0 items-center justify-center gap-1.5 rounded-[5px] px-2 text-xs text-muted outline-none hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus data-[state=active]:bg-raised data-[state=active]:text-surface data-[state=active]:shadow-xs',
    icon: 'size-3.5 shrink-0 data-[severity=error]:text-error data-[severity=warning]:text-warning',
    label: ''
  },
  variants: {
    segment: {
      /** A named tab, sharing the track's width with the other named tabs. */
      text: { trigger: 'flex-1', label: 'truncate sr-only @[200px]/tabs:not-sr-only' },
      /** A tab shown by its icon alone. */
      icon: { trigger: 'flex-none', label: 'sr-only' }
    }
  },
  defaultVariants: {
    segment: 'text' as const
  }
} as const

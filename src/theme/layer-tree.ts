const layerTreeTheme = {
  slots: {
    viewport: 'scrollbar-thin h-full overflow-y-auto px-2 pb-2',
    /** The top-level layer pinned over the list, inset like the rows beneath it. */
    sticky: 'absolute inset-x-2 top-0 z-10 border-b border-border bg-panel',
    row: 'group/row relative flex w-full cursor-pointer items-center gap-1 rounded-field border-none bg-transparent pr-1.5 text-left text-xs text-surface hover:bg-hover',
    disclosure:
      'flex w-4 shrink-0 cursor-pointer items-center justify-center text-current transition-transform',
    disclosurePlaceholder: 'w-4 shrink-0',
    icon: 'size-3 shrink-0',
    label: 'flex min-w-0 flex-1 items-center gap-1.5',
    actions: 'flex shrink-0 items-center gap-0.5',
    action:
      'flex size-4 items-center justify-center rounded text-current outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus',
    actionIcon: 'size-3',
    dropIndicator: 'pointer-events-none absolute bg-accent',
    renameRow: 'group/row relative flex w-full items-center gap-1 pr-1.5 text-xs text-surface',
    renameIcon: 'size-3 shrink-0 opacity-70',
    renameInput:
      'min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none'
  },
  variants: {
    selected: {
      // A tint of the accent, the same in and out of focus, as every selected row in the app.
      true: { row: 'bg-panel-selected-muted text-surface hover:bg-panel-selected-muted' },
      false: { row: 'bg-transparent text-surface hover:bg-hover' }
    },
    focused: {
      true: {},
      false: {}
    },
    dragging: {
      true: { row: 'opacity-30' },
      false: {}
    },
    visible: {
      true: {},
      false: {}
    },
    component: {
      true: { icon: 'text-component opacity-100' },
      false: { icon: 'opacity-70' }
    },
    slot: {
      true: { icon: 'text-slot opacity-100', label: 'text-slot' },
      false: {}
    },
    expanded: {
      true: { disclosure: 'rotate-90' },
      false: { disclosure: 'rotate-0' }
    },
    actionsVisible: {
      true: {},
      false: {
        actions: 'opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100'
      }
    },
    actionActive: {
      true: { actionIcon: 'opacity-100' },
      false: {
        actionIcon: 'opacity-0 group-hover/row:opacity-70 group-focus-within/row:opacity-70'
      }
    },
    childDropTarget: {
      true: {
        row: 'bg-accent/15 text-surface'
      },
      false: {}
    },
    dropPosition: {
      child: {
        dropIndicator: 'inset-y-1 rounded border border-accent bg-accent/10'
      },
      above: { dropIndicator: 'top-0 h-0.5' },
      below: { dropIndicator: 'bottom-0 h-0.5' }
    }
  },
  compoundVariants: [
    // A selected layer's icon reads at full strength on the tint.
    { selected: true, class: { icon: 'opacity-100' } },
    // A hidden layer dims while its name still reads at 4.5:1. Once selected, fading the row would
    // fade its highlight too, so only the icon dims.
    { visible: false, selected: false, class: { row: 'opacity-65' } },
    { visible: false, selected: true, class: { icon: 'opacity-50' } }
  ],
  defaultVariants: {
    selected: false,
    focused: false,
    dragging: false,
    visible: true,
    component: false,
    slot: false,
    expanded: false,
    actionsVisible: true,
    actionActive: false,
    childDropTarget: false
  }
}

export type LayerTreeTheme = typeof layerTreeTheme
export default layerTreeTheme

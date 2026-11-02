const toolbarTheme = {
  slots: {
    // The desktop toolbar floats at the bottom center of the canvas, a card-like pill.
    dock: 'absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center',
    bar: 'flex gap-0.5 rounded-xl border border-border bg-panel p-1 elevation-card',
    // Above the mobile drawer's header, clear of the home indicator.
    mobileDock:
      'fixed bottom-[calc(56px+env(safe-area-inset-bottom)+0.75rem)] left-1/2 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-1.5',
    mobileBar:
      'relative flex h-11 items-center overflow-hidden rounded-xl border border-border bg-panel px-2 elevation-card',
    mobileGroup: 'flex gap-0.5',
    button:
      'flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-panel-focus',
    icon: 'size-4',
    flyoutGroup: 'flex items-center',
    flyoutTrigger:
      'flex h-8 w-3 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted transition-colors outline-none data-[state=open]:bg-hover data-[state=open]:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    flyoutTriggerIcon: 'size-2.5',
    flyoutContent: '',
    flyoutItem: '',
    flyoutItemIndicator: 'flex size-3.5 shrink-0 items-center justify-center',
    flyoutItemIcon: 'size-3.5',
    flyoutItemLabel: 'flex-1',
    navigationAction:
      'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-panel text-muted elevation-card outline-none select-none focus-visible:ring-1 focus-visible:ring-panel-focus disabled:pointer-events-none',
    navigationIcon: 'size-3.5',
    action:
      'flex size-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted transition-colors outline-none select-none active:bg-hover active:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    actionIcon: 'size-4'
  },
  variants: {
    active: {
      // The armed tool is ink-filled; other toggles (IconButton active, segments) use the raised pill.
      true: {
        button: 'bg-surface text-panel'
      },
      false: {}
    },
    mobile: {
      true: {
        button: 'select-none',
        flyoutTrigger: 'select-none active:bg-hover active:text-surface'
      },
      false: {
        flyoutTrigger: 'hover:bg-hover hover:text-surface'
      }
    },
    disabled: {
      true: {
        navigationAction: 'pointer-events-none'
      },
      false: {}
    }
  },
  compoundVariants: [
    {
      active: false,
      mobile: true,
      class: {
        button: 'active:bg-hover'
      }
    },
    {
      active: false,
      mobile: false,
      class: {
        button: 'hover:bg-hover hover:text-surface'
      }
    }
  ],
  defaultVariants: {
    active: false,
    mobile: false,
    disabled: false
  }
}

export type ToolbarTheme = typeof toolbarTheme
export default toolbarTheme

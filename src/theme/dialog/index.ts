import { motionStyles } from '@/theme/motion/styles'

export default {
  slots: {
    overlay: ['fixed inset-0 z-40 bg-black/40', motionStyles.overlay],
    content: [
      'fixed top-1/2 left-1/2 z-50 flex max-h-[min(90vh,48rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden bg-panel outline-none data-[state=open]:zoom-in-98 data-[state=closed]:zoom-out-98',
      motionStyles.overlay
    ],
    header: 'flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3',
    heading: 'min-w-0',
    title: 'text-sm font-semibold text-surface data-[visually-hidden=true]:sr-only',
    description: 'text-xs text-muted',
    close:
      'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-muted outline-none hover:bg-hover hover:text-surface focus-visible:ring-2 focus-visible:ring-accent/50',
    body: 'min-h-0 flex-1 overflow-y-auto p-4',
    footer: 'flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3'
  },
  variants: {
    size: {
      sm: { content: 'w-[min(24rem,92vw)]' },
      md: { content: 'w-[min(32rem,94vw)]' },
      lg: { content: 'w-[min(46rem,94vw)]' },
      xl: { content: 'w-[min(64rem,96vw)]' },
      /** Nearly the whole window, for editors such as the variables dialog when expanded. */
      screen: { content: 'w-[98vw]' }
    },
    height: {
      auto: {},
      tall: { content: 'h-[min(75vh,48rem)]' },
      full: { content: 'h-[min(90vh,56rem)]' },
      screen: { content: 'h-[96vh] max-h-[96vh]' }
    },
    /**
     * The corners and shadow. A dialog is the largest card; a command surface such as the command
     * palette is drawn as the menus are, since it is a quick list rather than a window.
     */
    surface: {
      dialog: { content: 'rounded-dialog elevation-dialog' },
      floating: { content: 'rounded-xl ring-1 ring-border elevation-floating' }
    }
  },
  defaultVariants: {
    surface: 'dialog'
  }
} as const

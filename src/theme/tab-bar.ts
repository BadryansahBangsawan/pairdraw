/**
 * The document tabs in the top bar. The tab in front is a raised pill on the backdrop; the others
 * are plain labels until hovered.
 */
const tabBarTheme = {
  slots: {
    root: 'flex h-full min-w-0 items-center',
    // Sized by its tabs until the bar runs out of room; then it scrolls and fades the clipped side.
    scroller:
      'scrollbar-none flex h-full min-w-0 scroll-px-8 items-center overflow-x-auto data-overflow-end:mask-r-from-[calc(100%-2rem)] data-overflow-start:mask-l-from-[calc(100%-2rem)]',
    // The inline padding keeps the end tabs' ring inside the scroller, which clips it.
    list: 'flex h-full items-center gap-1 px-0.5',
    item: 'group/tab flex h-7 max-w-48 min-w-24 items-center rounded-lg pe-1 transition-colors',
    trigger:
      'flex h-full min-w-0 flex-1 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg ps-2.5 pe-1.5 text-xs outline-none select-none focus-visible:ring-2 focus-visible:ring-panel-focus',
    icon: 'size-3.5 shrink-0 opacity-60',
    label: 'min-w-0 flex-1 truncate',
    renameInput:
      'ms-1.5 h-5 min-w-0 flex-1 rounded-md border border-accent bg-input px-1 text-xs text-surface outline-none',
    close:
      'flex size-6 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-md transition-opacity group-hover/tab:opacity-100 hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus focus-visible:outline-none sm:size-5',
    closeIcon: 'size-3',
    dirtyDot: 'size-1.5 shrink-0 rounded-full bg-accent',
    newTab:
      'ms-1 flex size-7 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-muted transition-colors outline-none hover:bg-hover hover:text-surface focus-visible:ring-2 focus-visible:ring-panel-focus',
    newIcon: 'size-4',
    scroll:
      'mx-0.5 flex size-7 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-lg text-muted transition-colors outline-none hover:bg-hover hover:text-surface focus-visible:ring-2 focus-visible:ring-panel-focus data-start:order-first',
    scrollIcon: 'size-3.5'
  },
  variants: {
    // Home is pinned first as an icon, the way Figma's desktop app shows it.
    home: {
      true: {
        item: 'max-w-none min-w-0 pe-0',
        trigger: 'px-2'
      }
    },
    active: {
      true: {
        item: 'bg-raised text-surface shadow-xs ring-1 ring-border',
        close: 'opacity-100'
      },
      false: {
        item: 'text-muted hover:bg-hover hover:text-surface',
        close: 'opacity-0'
      }
    }
  },
  defaultVariants: {
    active: false,
    home: false
  }
}

export type TabBarTheme = typeof tabBarTheme
export default tabBarTheme

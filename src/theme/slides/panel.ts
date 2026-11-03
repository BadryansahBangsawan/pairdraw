/**
 * The Slides panel: a header with the deck's actions over a numbered column of slide thumbnails,
 * in slide order. A slide the canvas has selected is ringed in the accent; a drop between two
 * slides shows an accent line where the slide lands.
 */
const slidesPanelTheme = {
  slots: {
    panel: 'flex min-h-0 flex-1 flex-col',
    header: 'flex h-9 shrink-0 items-center gap-1 pr-2 pl-3.5',
    title: 'text-xs font-medium text-surface',
    count: 'text-xs text-muted tabular-nums',
    actions: 'ms-auto flex items-center gap-0.5',
    body: 'scrollbar-thin min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-2',
    list: 'flex flex-col gap-1',
    hint: 'sr-only'
  }
} as const

export type SlidesPanelTheme = typeof slidesPanelTheme
export default slidesPanelTheme

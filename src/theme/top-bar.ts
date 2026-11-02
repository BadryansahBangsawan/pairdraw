/**
 * The window's one bar, on the backdrop the panel cards sit on: the brand, which opens the app
 * menus, the document tabs, and the open document's actions at the far end.
 */
export default {
  slots: {
    root: 'flex h-11 shrink-0 items-center gap-2 bg-canvas px-2.5',
    brand:
      'flex h-8 shrink-0 items-center gap-2 rounded-lg ps-1 pe-1.5 text-[13px] font-semibold text-surface outline-none select-none',
    brandMark: 'size-6 shrink-0',
    // A phone keeps the mark alone, so the tabs keep the room.
    brandName: 'max-sm:hidden',
    brandChevron: 'size-3 shrink-0 text-muted',
    // Takes what the tabs leave, and gives it up first when the window narrows.
    spacer: 'min-w-0 flex-1',
    actions: 'flex shrink-0 items-center'
  },
  variants: {
    interactive: {
      true: {
        brand:
          'cursor-pointer transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=open]:bg-hover'
      },
      false: { brand: 'cursor-default' }
    }
  },
  defaultVariants: { interactive: false }
}

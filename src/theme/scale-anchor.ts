/** The Scale panel's anchor grid: nine points of the selection, the picked one filled. */
const scaleAnchorTheme = {
  slots: {
    root: 'grid size-16 shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-field border border-border bg-panel-field p-1',
    item: 'group flex size-full cursor-pointer items-center justify-center rounded-sm text-muted outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus data-[state=checked]:text-primary',
    dot: 'block size-1.5 rounded-full bg-current opacity-60 group-data-[state=checked]:size-2 group-data-[state=checked]:opacity-100'
  }
}

export default scaleAnchorTheme

/** The shader fill picker's gallery: complete shaders as radio tiles, the one the paint draws checked. */
export default {
  slots: {
    root: 'grid grid-cols-3 gap-1',
    tile: 'group flex min-w-0 cursor-pointer flex-col gap-1 rounded-lg border-none bg-transparent p-1 text-left outline-none transition-colors hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus data-[state=checked]:bg-panel-selected-muted',
    thumb:
      'block aspect-3/2 w-full overflow-hidden rounded-md border border-border bg-input group-data-[state=checked]:border-accent',
    image: 'size-full object-cover',
    label: 'truncate text-[11px] text-muted group-data-[state=checked]:text-surface'
  }
} as const

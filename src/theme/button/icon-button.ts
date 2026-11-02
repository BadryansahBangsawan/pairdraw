export default {
  base: 'flex cursor-pointer items-center justify-center bg-transparent text-muted outline-none hover:bg-hover hover:text-surface focus-visible:border-panel-focus',
  variants: {
    size: {
      xs: 'size-6 rounded-md border border-transparent text-sm leading-none',
      sm: 'size-7 rounded-lg border border-transparent text-sm leading-none',
      md: 'size-8 rounded-lg border border-transparent text-base leading-none',
      lg: 'size-9 rounded-lg border border-transparent text-base leading-none'
    },
    // A raised pill, the same as the chosen item of a segmented control, so toggles on its track
    // match it. On the canvas backdrop the caller adds `ring-1 ring-border`, as document tabs do.
    active: {
      true: 'bg-raised text-surface shadow-xs hover:bg-raised hover:text-surface'
    },
    disabled: {
      true: 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted'
    }
  },
  defaultVariants: {
    size: 'sm' as const,
    active: false as const,
    disabled: false as const
  }
}

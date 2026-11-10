/**
 * The presentation's controls: a floating pill at the bottom of the screen that steps through
 * the slides, switches between fitted and 100%, and leaves. It fades out while the pointer
 * rests, and back in as the pointer moves or a control takes focus.
 */
const slidesControlsTheme = {
  slots: {
    root: 'absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-panel p-1 text-surface elevation-floating transition-opacity duration-200 not-focus-within:data-idle:pointer-events-none not-focus-within:data-idle:opacity-0 motion-reduce:transition-none',
    position: 'min-w-16 px-1.5 text-center text-xs tabular-nums',
    divider: 'mx-1 h-4 w-px bg-border'
  }
} as const

export default slidesControlsTheme

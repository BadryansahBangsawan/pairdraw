/**
 * Shader Mode's transport: play or pause and back to the start, then the phase scrubber across
 * the loop with the time beside it.
 */
const shaderModeTransportTheme = {
  slots: {
    root: 'flex items-center gap-1',
    slider: 'relative mx-2 flex h-5 min-w-0 flex-1 touch-none items-center select-none',
    track: 'relative h-1 grow overflow-hidden rounded-full bg-panel-field',
    range: 'absolute h-full bg-accent',
    thumb:
      'block size-3.5 rounded-full border border-accent bg-panel elevation-floating outline-none focus-visible:ring-2 focus-visible:ring-panel-focus data-[disabled]:border-border',
    time: 'w-24 shrink-0 text-end text-xs text-muted tabular-nums'
  }
} as const

export default shaderModeTransportTheme

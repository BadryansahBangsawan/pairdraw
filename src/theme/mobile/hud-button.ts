/** The glass the mobile HUD's controls sit on over the canvas, edged in both themes. */
export const hudSurface = 'border border-border bg-panel/80 elevation-floating backdrop-blur-xl'

export default {
  slots: {
    base: [hudSurface, 'text-surface hover:bg-panel active:bg-hover'],
    icon: 'size-3.5 shrink-0'
  },
  variants: { iconOnly: { true: { base: 'size-8 p-0' }, false: {} } }
} as const

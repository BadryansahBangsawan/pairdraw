import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

/**
 * The top bar's avatar stack controls: your menu, collaborators to follow, and everyone. Rings
 * take the window backdrop's color inside a stack marked `data-surface="canvas"`.
 */
export default {
  slots: {
    trigger:
      'relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-panel-focus',
    chevron: 'size-2',
    /** On your avatar while you are in a room. */
    live: 'absolute -top-0.5 -right-0.5 size-2 rounded-full border border-panel bg-success-fill in-data-[surface=canvas]:border-canvas',
    overflow:
      'relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-panel bg-panel-field-hover text-[9px] font-semibold text-surface outline-none hover:bg-raised focus-visible:ring-2 focus-visible:ring-panel-focus in-data-[surface=canvas]:border-canvas',
    card: ['z-50 w-60 p-2', floatingSurface, motionStyles.floating],
    leave: 'mt-2 w-full'
  }
} as const

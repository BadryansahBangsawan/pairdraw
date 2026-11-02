/**
 * People overlapping in a row, each with their agent count beside the agents' violet sparkle, then
 * "+N". Badges and the overflow ring take the panel's color, or the window backdrop's in a stack
 * marked `data-surface="canvas"`; the overflow fill is opaque so the avatar under it does not show.
 */
export default {
  slots: {
    root: 'flex items-center -space-x-1.5',
    person: 'relative inline-flex shrink-0',
    // The count is text, so it takes the surface color; the violet, under 4.5:1 on the panel and
    // the backdrop, marks only the sparkle, which as an icon needs 3:1.
    badge:
      'absolute -right-1.5 -bottom-1 flex items-center gap-px rounded-full border border-panel bg-panel px-0.5 text-[8px] leading-none font-semibold text-surface in-data-[surface=canvas]:border-canvas in-data-[surface=canvas]:bg-canvas',
    badgeIcon: 'size-2 text-agent',
    /** On someone in the voice call with their microphone off. */
    muted:
      'absolute -bottom-1 -left-1 flex size-3 items-center justify-center rounded-full border border-panel bg-panel text-muted in-data-[surface=canvas]:border-canvas in-data-[surface=canvas]:bg-canvas',
    mutedIcon: 'size-2',
    overflow:
      'relative flex shrink-0 items-center justify-center rounded-full border-2 border-panel bg-panel-field-hover text-[9px] font-semibold text-surface in-data-[surface=canvas]:border-canvas'
  },
  variants: {
    size: {
      sm: { overflow: 'size-6' },
      md: { overflow: 'size-7' }
    }
  },
  defaultVariants: { size: 'sm' }
} as const

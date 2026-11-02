/**
 * The recessed track of a segmented control, as tall as a property field when its items are. A
 * row of toggle buttons that reads as one control, such as text formatting, sits on it too.
 */
export const segmentedTrack = 'inline-flex items-center gap-0.5 rounded-field bg-panel-field p-0.5'

/**
 * The chosen item is a raised pill on the track; the others are its label alone. Muted text an
 * option nests, such as a count, turns full strength on the pill, where muted falls short of AA.
 */
const segmentedControlTheme = {
  slots: {
    root: segmentedTrack,
    item: 'flex h-6 min-w-max flex-auto cursor-pointer items-center justify-center gap-1 rounded-[5px] text-muted outline-none hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus data-[state=on]:bg-raised data-[state=on]:text-surface data-[state=on]:shadow-xs data-[state=on]:[&_.text-muted]:text-surface disabled:cursor-not-allowed disabled:opacity-50'
  },
  variants: {
    size: {
      sm: { item: 'px-1.5 text-xs' },
      md: { item: 'px-2.5 text-xs' },
      touch: { item: 'h-10 min-w-10 px-2 text-xs' }
    }
  },
  defaultVariants: {
    size: 'sm' as const
  }
}

export type SegmentedControlTheme = typeof segmentedControlTheme
export default segmentedControlTheme

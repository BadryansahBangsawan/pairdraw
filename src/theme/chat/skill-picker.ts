/**
 * The composer's skill menu, past what the shared menu theme gives it: each skill by name with
 * what it is for under it, and the line that says when none is turned on.
 */
export default {
  slots: {
    triggerIcon: 'size-4',
    skillIcon: 'mt-px',
    itemText: 'flex min-w-0 flex-col gap-0.5',
    name: 'truncate text-xs font-medium',
    description: 'line-clamp-2 text-[11px] text-muted',
    empty: 'px-2 py-3 text-center text-xs text-muted'
  }
} as const

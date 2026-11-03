/**
 * A layer's notes for agents in the Design panel: a context field and a prompt field, each
 * labelled above, with the prompt's Run action under it.
 */
export default {
  slots: {
    root: 'flex flex-col gap-2.5',
    description: 'text-[11px] leading-snug text-muted',
    field: 'flex flex-col gap-1',
    label: 'text-[11px] text-muted',
    actions: 'flex justify-end'
  }
} as const

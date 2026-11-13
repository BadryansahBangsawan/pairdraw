/**
 * A page snapshot in the Design panel: its address, the device the picture was taken at, and
 * the actions that refresh it or open that page.
 */
export default {
  slots: {
    root: 'flex flex-col gap-2.5',
    actions: 'flex gap-2',
    time: 'text-[11px] leading-snug text-muted'
  }
} as const

/** The top bar's Share button, ink-filled like the app's other primary actions. */
export default {
  base: 'flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border-none px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-panel-focus disabled:cursor-not-allowed disabled:opacity-50',
  variants: {
    connection: {
      idle: 'bg-surface text-panel hover:bg-surface/85',
      joining:
        'animate-pulse motion-reduce:animate-none border border-warning-border bg-warning-bg text-warning',
      // Still a share action when connected; your avatar shows the room is live.
      connected: 'bg-surface text-panel hover:bg-surface/85'
    }
  },
  defaultVariants: { connection: 'idle' }
} as const

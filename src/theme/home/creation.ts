/**
 * Home's choice of what to create: a row of pills over the prompt that wraps, with the chosen
 * one raised. The import cards sit under the prompt as three equal tiles.
 */
export default {
  slots: {
    kinds: 'mb-3 flex flex-wrap items-center justify-center gap-1.5',
    kind: 'flex',
    kindIcon: 'size-3.5 shrink-0',
    cards: 'mx-auto mb-8 flex w-full max-w-2xl flex-col gap-2 @lg/home:flex-row @2xl/home:mb-10',
    card: 'flex min-h-16 w-full flex-1 flex-col items-center justify-center gap-1.5 rounded-card border border-border bg-panel px-3 py-3 text-xs text-surface transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
    cardIcon: 'size-4 shrink-0 text-muted'
  }
} as const

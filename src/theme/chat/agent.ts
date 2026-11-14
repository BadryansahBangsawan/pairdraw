import { motionStyles } from '../motion/styles'

/**
 * A coding agent on this computer in the chat column: the card that looks for one, offers it,
 * and connects it before AI is set up, and the line that names the agent the chat switched to.
 */
export default {
  slots: {
    /** The card's place in the column, centered while the conversation is empty. */
    root: 'flex min-h-0 flex-col overflow-y-auto px-3.5 py-4 outline-none',
    /** The empty state when no agent can be used, inside the root's own padding. */
    placeholder: 'p-0',
    /** Reads out what the card says now, from a line that stays as the card changes. */
    announcement: 'sr-only',
    card: 'flex flex-col gap-3 rounded-card border border-border bg-panel-secondary p-4',
    header: 'flex items-start gap-3',
    /** Tinted while looking; the offered agent's logo sits on a neutral tile, true to its colors. */
    tile: 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent data-[logo]:border data-[logo]:border-border data-[logo]:bg-panel data-[logo]:text-surface',
    tileIcon: 'size-4',
    tileSpinner: `size-4 ${motionStyles.spinner}`,
    /** Takes focus when the button that had it goes, so the keyboard stays in the card. */
    heading: 'flex min-h-8 min-w-0 flex-1 flex-col justify-center outline-none',
    title: 'text-xs leading-relaxed font-medium text-pretty text-surface',
    description: 'text-xs leading-relaxed text-muted',
    help: 'text-xs leading-relaxed text-muted',
    steps: 'flex flex-col gap-1.5',
    actions: 'flex w-full flex-col gap-2',
    /** The line saying a prompt waits for setup, or for the agent to connect. */
    waiting: 'flex items-start gap-1.5 text-[11px] leading-4 text-muted',
    waitingIcon: 'mt-0.5 size-3 shrink-0',
    notice: 'flex items-center gap-2 px-3.5 py-1.5 text-xs text-muted',
    noticeIcon: 'size-3.5 shrink-0 text-agent',
    /** The agent's own logo, in its colors or the text color, in place of the generic icon. */
    noticeLogo: 'size-3.5 text-surface',
    noticeText: 'min-w-0 flex-1 leading-4 text-pretty',
    /** The agent refused a message because nobody is signed in to it. */
    failure: 'px-3.5 pb-2'
  },
  variants: {
    /** Fills the column while the conversation is empty, above the composer. */
    fill: {
      // `safe` keeps a card taller than the column scrollable from its top.
      true: { root: 'flex-1 justify-center-safe' },
      false: { root: 'shrink-0' }
    }
  },
  defaultVariants: { fill: true }
} as const

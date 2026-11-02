/**
 * The conversation's scrolling column: its messages, the agent's typing dots in its violet, the
 * Continue offer, and the jump back to the latest message.
 */
export default {
  slots: {
    root: 'relative min-h-0 flex-1',
    viewport: 'h-full px-3.5 py-3 [&>div]:h-full',
    list: 'flex flex-col gap-3',
    typing: 'flex items-center gap-2',
    typingAvatar:
      'flex size-6 shrink-0 items-center justify-center rounded-full bg-agent/15 text-agent',
    typingIcon: 'size-3',
    dots: 'flex items-center gap-1 py-2',
    // Each dot bounces a beat after the one before it.
    dot: 'size-1.5 animate-bounce rounded-full bg-muted motion-reduce:animate-none data-[step=1]:[animation-delay:150ms] data-[step=2]:[animation-delay:300ms]',
    continue: 'flex justify-center py-2',
    scrollbar: 'flex w-1.5 touch-none p-px select-none',
    thumb: 'relative flex-1 rounded-full bg-muted/30',
    jump: 'absolute right-3 bottom-3 rounded-full border border-border bg-panel elevation-floating'
  }
} as const

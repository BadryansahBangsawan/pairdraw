/** A reply's reasoning, folded into a card like a tool call, marked in the agent's violet. */
export default {
  slots: {
    root: 'rounded-xl border border-border bg-panel-secondary',
    trigger:
      'flex w-full cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] text-muted hover:bg-hover hover:text-surface',
    icon: 'size-3.5 shrink-0 text-agent',
    label: 'flex-1',
    spinner: 'size-3 animate-spin motion-reduce:animate-none',
    chevron:
      'size-3 transition-transform motion-reduce:transition-none [[data-state=open]>&]:rotate-180',
    body: 'border-t border-border px-2.5 py-1.5 text-[11px] leading-relaxed text-muted'
  }
} as const

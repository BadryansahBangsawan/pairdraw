/**
 * A chat turn: what the person wrote as an ink bubble on the right, the agent's reply as plain
 * text on the panel with its actions beneath it, and messages still waiting to be sent.
 */
export default {
  slots: {
    root: 'group/message data-[role=user]:flex data-[role=user]:justify-end',
    column: 'min-w-0 space-y-2 select-text group-data-[role=user]/message:max-w-[85%]',
    // A reverted reply's edits are gone; its content stays, dimmed, under its actions. Text dims
    // to the muted color rather than through opacity, so it still reads at 4.5:1.
    reply: 'space-y-2 data-[reverted=true]:**:text-muted data-[reverted=true]:[&_img]:opacity-50',
    text: 'text-xs leading-relaxed text-surface',
    // The reply's Copy and turn actions, drawn by ChatTurnActions only when it has one to show.
    footer: 'flex flex-wrap items-center gap-1',
    // Hover shows the reply's own actions; touch screens, which cannot hover, always show them.
    copy: 'opacity-0 group-hover/message:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
    copyIcon: 'size-3',
    copied: 'size-3 text-success',
    request: 'group/request relative',
    bubble:
      'rounded-xl rounded-br-md bg-surface px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-panel',
    edit: 'absolute top-1/2 -left-7 -translate-y-1/2 opacity-0 group-hover/request:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
    retry: 'flex justify-end',
    queued: 'flex flex-col items-end gap-1',
    queuedBubble:
      'max-w-[85%] rounded-xl rounded-br-md border border-dashed border-muted/40 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-muted',
    queuedStatus: 'flex items-center gap-1 text-[10px] text-muted'
  }
} as const

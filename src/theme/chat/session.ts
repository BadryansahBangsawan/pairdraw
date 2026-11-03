/**
 * A coding agent's session in the chat: the composer's model, reasoning, and mode pickers, and
 * the project folder in the chat's header.
 */
export default {
  slots: {
    controls: 'flex min-w-0 shrink items-center',
    trigger:
      'flex min-w-0 shrink items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    triggerContent: 'flex min-w-0 items-center gap-1',
    triggerIcon: 'size-3 shrink-0',
    /** Narrow composers show the icon and the model; reasoning and mode keep only their icon. */
    triggerValue: 'max-w-24 min-w-0 truncate',
    triggerSecondaryValue: 'hidden max-w-20 min-w-0 truncate @[22rem]:inline',
    triggerChevron: 'size-2.5 shrink-0',
    folder:
      'flex h-6 max-w-32 min-w-0 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus data-[set=true]:text-surface',
    folderIcon: 'size-3.5 shrink-0',
    folderName: 'min-w-0 truncate',
    menuIcon: 'size-3.5 shrink-0 text-muted'
  }
} as const

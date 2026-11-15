/**
 * A coding agent's session in the chat: the composer's model, reasoning, and mode pickers, and
 * the project folder in the chat's header.
 */
export default {
  slots: {
    controls: 'flex shrink-0 items-center',
    // A control never shrinks past its icon and chevron: below that they would overlap.
    trigger:
      'flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus',
    triggerContent: 'flex items-center gap-1',
    triggerIcon: 'size-3 shrink-0',
    /**
     * A narrow composer keeps each control's icon, and its tooltip names the value. The model and
     * the chevrons come back with room, then reasoning and mode.
     */
    triggerValue: 'hidden max-w-24 min-w-0 truncate @[12rem]:inline',
    triggerSecondaryValue: 'hidden max-w-20 min-w-0 truncate @[22rem]:inline',
    triggerChevron: 'hidden size-2.5 shrink-0 @[12rem]:block',
    folder:
      'flex h-6 max-w-32 min-w-0 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted outline-none hover:bg-hover hover:text-surface focus-visible:ring-1 focus-visible:ring-panel-focus data-[set=true]:text-surface',
    folderIcon: 'size-3.5 shrink-0',
    folderName: 'min-w-0 truncate',
    menuIcon: 'size-3.5 shrink-0 text-muted'
  }
} as const

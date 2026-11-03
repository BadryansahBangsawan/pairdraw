/** The dialog that edits the style kit pinned to a chat. */
export default {
  slots: {
    body: 'flex flex-col gap-4',
    field: 'flex flex-col gap-1.5',
    label: 'text-xs font-medium text-surface',
    hint: 'text-[11px] text-muted',
    error: 'text-[11px] text-error',
    colors: 'space-y-1',
    color: 'flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-hover',
    swatch: 'size-5 shrink-0 rounded-md ring-1 ring-border',
    colorName: 'min-w-0 flex-1 truncate text-xs text-surface',
    colorHex: 'font-mono text-[11px] text-muted',
    addColor: 'grid grid-cols-[1fr_7rem_auto] items-center gap-1.5',
    documentStyles: 'mr-auto'
  }
} as const

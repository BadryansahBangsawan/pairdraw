const panelSectionTheme = {
  slots: {
    root: 'border-b border-border px-3.5 pb-3 text-surface data-[disabled]:opacity-60',
    header: 'flex h-9 min-w-0 items-center gap-2',
    title:
      'min-w-0 flex-1 cursor-default truncate border-0 bg-transparent p-0 text-left text-xs font-medium text-surface',
    actions:
      'flex h-7 w-[26px] shrink-0 items-center justify-end gap-0.5 [&_[data-slot=icon-button]]:size-6 [&_[data-slot=icon-button]]:rounded-md',
    body: 'min-w-0 data-[state=closed]:hidden'
  }
}

export type PanelSectionTheme = typeof panelSectionTheme
export default panelSectionTheme

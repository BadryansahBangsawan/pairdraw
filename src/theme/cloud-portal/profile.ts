/** A public profile's workspaces and their documents, as cards under the person's name. */
export default {
  slots: {
    workspace: 'rounded-card border border-border bg-panel elevation-card',
    workspaceName: 'border-b border-border px-3.5 py-3 text-xs font-medium text-surface',
    documents: 'flex flex-col py-1',
    document:
      'flex items-center gap-3 px-3.5 py-2 text-left outline-none hover:bg-hover focus-visible:bg-hover',
    documentIcon: 'size-4 shrink-0 text-muted',
    documentBody: 'flex min-w-0 flex-1 flex-col',
    documentName: 'truncate text-sm text-surface',
    documentDetail: 'text-xs text-muted',
    empty: 'px-3.5 py-3 text-sm text-muted',
    settings: 'flex flex-col gap-3',
    settingsActions: 'flex flex-wrap items-center gap-2'
  }
} as const

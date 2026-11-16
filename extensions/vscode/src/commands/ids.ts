/** Command IDs, declared in `package.json` and run by `extension.ts`. */
export const COMMAND_IDS = {
  toggleDesignMode: 'pairdraw.toggleDesignMode',
  openEditor: 'pairdraw.openEditor',
  exportSelection: 'pairdraw.exportSelection'
} as const

export const SIDEBAR_VIEW_ID = 'pairdraw.sidebar'

export interface SidebarAction {
  command: (typeof COMMAND_IDS)[keyof typeof COMMAND_IDS]
  title: string
}

/** The sidebar's three buttons, in the order they render. */
export const SIDEBAR_ACTIONS: readonly SidebarAction[] = [
  { command: COMMAND_IDS.openEditor, title: 'Open Pairdraw Editor' },
  { command: COMMAND_IDS.toggleDesignMode, title: 'Toggle Design Mode' },
  { command: COMMAND_IDS.exportSelection, title: 'Export as PNG' }
]

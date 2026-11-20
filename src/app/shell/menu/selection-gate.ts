/**
 * Menu items that act on the selected layers, so they wait for one, as Figma's do. Terms that
 * export, replace, or format the selection belong here; terms that work on a page without one
 * (Export Frames to PDF, Paste) do not.
 */
export const MENU_ITEMS_NEEDING_SELECTION: ReadonlySet<string> = new Set([
  'copy',
  'cut',
  // Export selection writes the selected layers, so it waits for one like Copy does.
  'export-selection',
  'export-png',
  'export-svg',
  'export-pptx',
  'export-drawio',
  'export-fig'
])

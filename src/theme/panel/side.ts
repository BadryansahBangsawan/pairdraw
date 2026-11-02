/**
 * The inside of the layers and properties panels. The card around them, its radius, border, and
 * elevation, belongs to the workspace (`src/theme/editor/workspace.ts`), never to these slots.
 */
export default {
  slots: {
    /** The panel's column, contained so its repaints and layout never reach the canvas. */
    root: 'flex min-w-0 flex-1 flex-col overflow-hidden contain-layout contain-paint contain-style',
    /** The bar across the top that switches what the panel shows: Layers or Assets, Design or Code. */
    switcher: 'shrink-0 border-b border-border px-3.5 py-2.5',
    /** A heading over a list, lined up with the panel's section titles. */
    heading: 'flex h-9 shrink-0 items-center px-3.5 text-xs font-medium text-surface'
  }
} as const

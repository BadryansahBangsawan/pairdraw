/**
 * The desktop editor's frame: the side panels are cards inset from the window's edges on the
 * backdrop, and the canvas between them reaches their inner edges.
 *
 * The splitter sizes each side panel (the dock) as a share of the group with `flex-basis: 0`, so a
 * dock must not have padding, which would add to its share. The inset is the card's margin inside
 * its dock instead, and the widths the layout keeps include it (`EDITOR_PANEL_INSET` in
 * `src/app/shell/layout-storage.ts`). Reka gives every panel an inline `overflow: hidden`; the dock
 * overrides it so a card's shadow falls on the canvas, and the card clips its own content instead.
 */
export default {
  slots: {
    group: 'flex-1 overflow-hidden bg-canvas',
    dock: 'flex min-w-0 overflow-visible!',
    card: 'relative z-10 mb-2.5 flex min-w-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-panel elevation-card',
    canvas: 'relative flex min-w-0 flex-1'
  },
  variants: {
    side: {
      layers: { card: 'ms-2.5' },
      properties: { card: 'me-2.5' },
      chat: { card: 'me-2.5' }
    }
  }
}

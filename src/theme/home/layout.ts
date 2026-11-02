/**
 * The home tab: the sidebar and the documents as two cards inset on the dotted window backdrop,
 * their tops flush under the top bar as the editor's side cards are. The documents card is the
 * `home` container its sections lay themselves out by.
 */
export default {
  slots: {
    root: 'flex min-h-0 flex-1 gap-2.5 bg-canvas px-2.5 pb-2.5 text-surface dot-grid',
    sidebar: 'hidden md:flex',
    main: '@container/home flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-card border border-border bg-panel elevation-card',
    content: 'mx-auto flex w-full max-w-6xl flex-col px-4 py-5 @2xl/home:px-8 @2xl/home:py-8',
    locations: 'mb-4 md:hidden'
  }
} as const
